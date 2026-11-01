import { z } from "zod";
import { prisma } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { dateOnly, optionalText, parse, requiredText } from "../validation";
import { orgToday } from "./reports";
import { findNomenclature } from "@/lib/nomenclature-06-104";
import { toMinor, fromMinor } from "@/lib/money";
import type { DestinationKind } from "@/lib/generated/prisma/enums";

/**
 * Special hazardous waste (déchets spéciaux dangereux, class SD of décret 06-104).
 *
 *  - Décret 04-409 (JORA n° 81/2004): the carrier needs a valid transport authorisation on every trip (art. 13–16); every
 *    trip is accompanied by a movement document signed by shipper, carrier and consignee (art. 17, 21), which also records
 *    a party's refusal (art. 17); the carrier may not leave the treatment facility before the container is decontaminated
 *    (art. 19). The official form is fixed by an interministerial arrêté (art. 18) not obtained → this is internal tracking.
 *  - Law 01-19 art. 15 and 19 (as amended by law 25-02): only licensed facilities / approved operators.
 *  - Décret 05-315 (JORA n° 62/2005): annual declaration by the generator/holder, on the annex form, within three months
 *    after the close of the year (art. 3) → `annualDeclaration` pre-fills it from weight tickets.
 */
export const CONSISTENCIES = ["SOLID", "LIQUID", "GASEOUS", "PASTY"] as const;

// ───────────────────────────── Carrier authorisation (04-409 art. 13–16) ─────────────────────────────

export async function setTransportAuthorisation(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "settings.manage");
  const data = parse(z.object({
    hazTransportAuthNumber: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(80).nullable()),
    hazTransportAuthExpiresOn: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  }), input);
  if (Boolean(data.hazTransportAuthNumber) !== Boolean(data.hazTransportAuthExpiresOn)) throw new DomainError("errors.validation", { fields: { hazTransportAuthExpiresOn: "required" } });
  await prisma.organization.update({
    where: { id: ctx.org.id },
    data: { hazTransportAuthNumber: data.hazTransportAuthNumber, hazTransportAuthExpiresOn: data.hazTransportAuthExpiresOn ? dateOnly(data.hazTransportAuthExpiresOn) : null },
  });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "hazardous.transport_authorisation_set", entityType: "Organization", entityId: ctx.org.id, data });
}

async function validAuthorisation(ctx: OrgContext) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { hazTransportAuthNumber: true, hazTransportAuthExpiresOn: true } });
  if (!org.hazTransportAuthNumber || !org.hazTransportAuthExpiresOn) throw new DomainError("errors.hazardous.noAuthorisation");
  if (org.hazTransportAuthExpiresOn.toISOString().slice(0, 10) < orgToday(ctx)) throw new DomainError("errors.hazardous.authorisationExpired");
  return { number: org.hazTransportAuthNumber, expiresOn: org.hazTransportAuthExpiresOn };
}

// ───────────────────────────── Movements (04-409 art. 17–21) ─────────────────────────────

const createSchema = z.object({
  customerId: requiredText(64),
  destinationId: requiredText(64),
  workOrderId: optionalText(64),
  vehicleId: optionalText(64),
  wasteCode: z.string().trim().regex(/^\d{1,2}\.\d{1,2}\.\d{1,2}$/),
  consistency: z.enum(CONSISTENCIES),
  quantityKg: z.coerce.number().positive().max(1_000_000),
  packaging: requiredText(200),
  labelled: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export async function createMovement(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "workorders.dispatch");
  const data = parse(createSchema, input);
  const entry = findNomenclature(data.wasteCode, "SD");
  if (!entry) throw new DomainError("errors.hazardous.notSdCode");
  const auth = await validAuthorisation(ctx);
  return prisma.$transaction(async (tx) => {
    const [customer, destination, workOrder, vehicle] = await Promise.all([
      tx.customer.findFirst({ where: { id: data.customerId, organizationId: ctx.org.id } }),
      tx.destination.findFirst({ where: { id: data.destinationId, organizationId: ctx.org.id, active: true } }),
      data.workOrderId ? tx.workOrder.findFirst({ where: { id: data.workOrderId, organizationId: ctx.org.id } }) : null,
      data.vehicleId ? tx.vehicle.findFirst({ where: { id: data.vehicleId, organizationId: ctx.org.id } }) : null,
    ]);
    if (!customer) throw new NotFoundError("Customer");
    if (!destination) throw new NotFoundError("Destination");
    if (data.workOrderId && !workOrder) throw new NotFoundError("WorkOrder");
    if (data.vehicleId && !vehicle) throw new NotFoundError("Vehicle");
    if (workOrder && workOrder.customerId !== customer.id) throw new DomainError("errors.validation", { fields: { workOrderId: "invalid" } });
    // Law 01-19 art. 15/19: licensed facility only.
    if (!destination.registrationNumber) throw new DomainError("errors.recycling.specialNeedsLicence");
    const number = await nextNumber(tx, ctx.org.id, "hazmove", "DM");
    const m = await tx.hazardousMovement.create({
      data: {
        organizationId: ctx.org.id, number, customerId: customer.id, destinationId: destination.id, workOrderId: workOrder?.id ?? null, vehicleId: vehicle?.id ?? null,
        wasteCode: entry[0], designation: entry[2], hazardCriteria: entry[3], consistency: data.consistency,
        quantityKg: fromMinor(toMinor(data.quantityKg.toFixed(2))), packaging: data.packaging, labelled: data.labelled,
        carrierAuthNumber: auth.number, carrierAuthExpiresOn: auth.expiresOn, createdById: ctx.userId,
      },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "hazardous.movement_created", entityType: "HazardousMovement", entityId: m.id, data: { number, wasteCode: m.wasteCode } });
    return m;
  });
}

async function loadForUpdate(ctx: OrgContext, id: string) {
  const m = await prisma.hazardousMovement.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!m) throw new NotFoundError("HazardousMovement");
  return m;
}

function canExecute(ctx: OrgContext) {
  if (!hasPermission(ctx, "workorders.dispatch") && !hasPermission(ctx, "workorders.execute")) throw new ForbiddenError("workorders.execute");
}

/** Pickup: shipper signs (name as written on the paper), carrier signs (the signed-in user). Needs labels (art. 6) and a valid authorisation on the day (art. 16). */
export async function pickUp(ctx: OrgContext, id: string, input: unknown) {
  canExecute(ctx);
  const { shipperSignedName } = parse(z.object({ shipperSignedName: requiredText(120) }), input);
  const m = await loadForUpdate(ctx, id);
  if (m.status !== "DRAFT") throw new DomainError("errors.invalidTransition", { entity: "HazardousMovement", from: m.status, to: "IN_TRANSIT" });
  if (!m.labelled) throw new DomainError("errors.hazardous.notLabelled");
  await validAuthorisation(ctx);
  const now = new Date();
  const r = await prisma.hazardousMovement.updateMany({ where: { id, organizationId: ctx.org.id, status: "DRAFT" }, data: { status: "IN_TRANSIT", shipperSignedName, shipperSignedAt: now, carrierSignedById: ctx.userId, carrierSignedAt: now } });
  if (r.count !== 1) throw new DomainError("errors.invalidTransition", { entity: "HazardousMovement" });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "hazardous.movement_picked_up", entityType: "HazardousMovement", entityId: id });
}

/** Delivery: consignee signs; the container must have been cleaned and decontaminated before the carrier leaves (art. 19). */
export async function deliver(ctx: OrgContext, id: string, input: unknown) {
  canExecute(ctx);
  const data = parse(z.object({ consigneeSignedName: requiredText(120), decontaminated: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()) }), input);
  if (!data.decontaminated) throw new DomainError("errors.hazardous.notDecontaminated");
  const m = await loadForUpdate(ctx, id);
  if (m.status !== "IN_TRANSIT") throw new DomainError("errors.invalidTransition", { entity: "HazardousMovement", from: m.status, to: "DELIVERED" });
  const r = await prisma.hazardousMovement.updateMany({ where: { id, organizationId: ctx.org.id, status: "IN_TRANSIT" }, data: { status: "DELIVERED", consigneeSignedName: data.consigneeSignedName, consigneeSignedAt: new Date(), decontaminated: true } });
  if (r.count !== 1) throw new DomainError("errors.invalidTransition", { entity: "HazardousMovement" });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "hazardous.movement_delivered", entityType: "HazardousMovement", entityId: id });
}

/** A party refuses to perform its task (art. 17) — recorded with who and why; final. */
export async function refuse(ctx: OrgContext, id: string, input: unknown) {
  canExecute(ctx);
  const data = parse(z.object({ refusedByRole: z.enum(["SHIPPER", "CARRIER", "CONSIGNEE"]), refusalReason: requiredText(500) }), input);
  const m = await loadForUpdate(ctx, id);
  if (!["DRAFT", "IN_TRANSIT"].includes(m.status)) throw new DomainError("errors.invalidTransition", { entity: "HazardousMovement", from: m.status, to: "REFUSED" });
  const r = await prisma.hazardousMovement.updateMany({ where: { id, organizationId: ctx.org.id, status: m.status }, data: { status: "REFUSED", refusedByRole: data.refusedByRole, refusalReason: data.refusalReason, refusedAt: new Date() } });
  if (r.count !== 1) throw new DomainError("errors.invalidTransition", { entity: "HazardousMovement" });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "hazardous.movement_refused", entityType: "HazardousMovement", entityId: id, data: { by: data.refusedByRole } });
}

export async function cancelMovement(ctx: OrgContext, id: string) {
  requirePermission(ctx, "workorders.dispatch");
  const m = await loadForUpdate(ctx, id);
  if (m.status !== "DRAFT") throw new DomainError("errors.invalidTransition", { entity: "HazardousMovement", from: m.status, to: "CANCELLED" });
  await prisma.hazardousMovement.updateMany({ where: { id, organizationId: ctx.org.id, status: "DRAFT" }, data: { status: "CANCELLED" } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "hazardous.movement_cancelled", entityType: "HazardousMovement", entityId: id });
}

export async function listMovements(ctx: OrgContext) {
  requirePermission(ctx, "workorders.read");
  return prisma.hazardousMovement.findMany({
    where: { organizationId: ctx.org.id },
    include: { customer: { select: { name: true } }, destination: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getMovement(ctx: OrgContext, id: string) {
  requirePermission(ctx, "workorders.read");
  const m = await prisma.hazardousMovement.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      customer: { select: { id: true, name: true, code: true } },
      destination: { select: { name: true, kind: true, registrationNumber: true, wilaya: true, address: true } },
      workOrder: { select: { id: true, number: true } },
      vehicle: { select: { plateNumber: true } },
      organization: { select: { name: true, legalName: true, address: true, taxId: true } },
    },
  });
  if (!m) return null;
  const carrier = m.carrierSignedById ? await prisma.user.findUnique({ where: { id: m.carrierSignedById }, select: { name: true } }) : null;
  return { ...m, carrierSignedName: carrier?.name ?? null };
}

export async function hazardousStatus(ctx: OrgContext) {
  requirePermission(ctx, "workorders.read");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { hazTransportAuthNumber: true, hazTransportAuthExpiresOn: true } });
  const expires = org.hazTransportAuthExpiresOn?.toISOString().slice(0, 10) ?? null;
  return { authNumber: org.hazTransportAuthNumber, authExpiresOn: expires, authValid: Boolean(org.hazTransportAuthNumber && expires && expires >= orgToday(ctx)) };
}

// ───────────────────────────── Annual declaration (05-315) ─────────────────────────────

/** Section C of the annex: réutilisation / recyclage / valorisation / élimination, from the destination kind. */
const SECTION_C: Record<DestinationKind, "reuse" | "recycling" | "valorisation" | "elimination"> = {
  REUSE_REPAIR: "reuse",
  RECYCLER: "recycling",
  SORTING_CENTRE: "recycling",
  COMPOSTING: "valorisation",
  ANAEROBIC_DIGESTION: "valorisation",
  ENERGY_RECOVERY: "valorisation",
  LANDFILL: "elimination",
  INCINERATION: "elimination",
  OTHER_DISPOSAL: "elimination",
};

/**
 * Pre-filled 05-315 declaration for one customer (the generator) and one calendar year, from weight tickets of work orders
 * whose category is classified SPECIAL_HAZARDOUS. Fields only the generator knows (raw material, chemical composition,
 * storage, prevention measures) are left blank for it to complete. Quantities in tonnes.
 */
export async function annualDeclaration(ctx: OrgContext, customerId: string, year: number) {
  const portalOwn = ctx.role === "CUSTOMER_PORTAL" && ctx.customerId === customerId;
  if (!portalOwn && !hasPermission(ctx, "customers.read")) throw new ForbiddenError("customers.read");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new DomainError("errors.validation");
  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId: ctx.org.id } });
  if (!customer) throw new NotFoundError("Customer");
  const tickets = await prisma.weightTicket.findMany({
    where: {
      organizationId: ctx.org.id,
      weighedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
      workOrder: { customerId, wasteCategory: { regulatoryClass: "SPECIAL_HAZARDOUS" } },
    },
    include: { destination: { select: { name: true, kind: true, registrationNumber: true } }, workOrder: { select: { wasteCategory: { select: { id: true, code: true, nameFr: true, nomenclatureCode: true } } } } },
    orderBy: { weighedAt: "asc" },
  });
  type Line = { categoryId: string; categoryName: string; code: string | null; designation: string | null; criteria: string | null; minor: number; untrackedMinor: number; c: Record<"reuse" | "recycling" | "valorisation" | "elimination", number>; installations: Set<string> };
  const lines = new Map<string, Line>();
  for (const t of tickets) {
    const cat = t.workOrder.wasteCategory!;
    const e = cat.nomenclatureCode ? findNomenclature(cat.nomenclatureCode, "SD") : undefined;
    // One line per 06-104 code when the category has one (so transports with the same code merge into it).
    const key = e ? `code:${e[0]}` : cat.id;
    const l = lines.get(key) ?? { categoryId: cat.id, categoryName: cat.nameFr, code: e?.[0] ?? null, designation: e?.[2] ?? null, criteria: e?.[3] ?? null, minor: 0, untrackedMinor: 0, c: { reuse: 0, recycling: 0, valorisation: 0, elimination: 0 }, installations: new Set<string>() };
    const net = toMinor(t.netKg);
    l.minor += net;
    if (t.destination) {
      const rejected = Math.min(toMinor(t.rejectedKg), net);
      const bucket = SECTION_C[t.destination.kind];
      l.c[bucket] += net - rejected;
      l.c.elimination += bucket === "elimination" ? 0 : rejected;
      l.installations.add(`${t.destination.name}${t.destination.registrationNumber ? ` (${t.destination.registrationNumber})` : ""}`);
    } else l.untrackedMinor += net;
    lines.set(key, l);
  }
  const tonnes = (minor: number) => Math.round(minor / 100) / 1000;
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { name: true, legalName: true } });
  const movements = await prisma.hazardousMovement.findMany({
    where: { organizationId: ctx.org.id, customerId, status: "DELIVERED", consigneeSignedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
    select: { number: true, wasteCode: true, designation: true, hazardCriteria: true, quantityKg: true, workOrderId: true, destination: { select: { name: true, kind: true, registrationNumber: true } } },
    orderBy: { number: "asc" },
  });
  // Delivered transports not linked to a work order are not covered by weight tickets: count their declared quantity.
  for (const m of movements.filter((x) => !x.workOrderId)) {
    const key = `code:${m.wasteCode}`;
    const l = lines.get(key) ?? { categoryId: key, categoryName: m.designation, code: m.wasteCode, designation: m.designation, criteria: m.hazardCriteria, minor: 0, untrackedMinor: 0, c: { reuse: 0, recycling: 0, valorisation: 0, elimination: 0 }, installations: new Set<string>() };
    const q = toMinor(m.quantityKg);
    l.minor += q;
    l.c[SECTION_C[m.destination.kind]] += q;
    l.installations.add(`${m.destination.name}${m.destination.registrationNumber ? ` (${m.destination.registrationNumber})` : ""}`);
    lines.set(key, l);
  }
  return {
    year, customer, collector: org,
    // Art. 3: within three months after the close of the year.
    dueBy: `${year + 1}-03-31`,
    lines: [...lines.values()].map((l) => ({ ...l, tonnes: tonnes(l.minor), untrackedTonnes: tonnes(l.untrackedMinor), c: { reuse: tonnes(l.c.reuse), recycling: tonnes(l.c.recycling), valorisation: tonnes(l.c.valorisation), elimination: tonnes(l.c.elimination) }, installations: [...l.installations] })),
    movements: movements.map((m) => ({ number: m.number, wasteCode: m.wasteCode, quantityKg: Number(m.quantityKg) })),
    tickets: tickets.length,
  };
}
