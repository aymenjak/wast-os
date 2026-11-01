import { CLASS_LETTER, findNomenclature } from "@/lib/nomenclature-06-104";
import { z } from "zod";
import { prisma } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { dateOnly, isoDate, optionalText, parse, requiredText } from "../validation";
import { addSplits, diversionRate, EMPTY_SPLIT, organicOutsideBiological, splitTicket, type Split } from "../domain/recovery";
import { toMinor, fromMinor } from "@/lib/money";
import type { DestinationKind, MaterialStream } from "@/lib/generated/prisma/enums";

/**
 * Recycling R1 — proof of recovery (RECYCLING.md §3).
 * Every figure is computed from weight tickets (stream + destination + rejects); nothing is estimated.
 * Destinations and tickets are tenant-scoped through composite foreign keys.
 */
export const STREAMS = ["PAPER_CARDBOARD", "PET", "HDPE_PP", "PLASTIC_FILM", "MIXED_PLASTIC", "FERROUS", "ALUMINIUM", "GLASS", "ORGANIC", "WOOD", "TEXTILE", "INERT", "SPECIAL", "RESIDUAL"] as const;
export const DESTINATION_KINDS = ["RECYCLER", "SORTING_CENTRE", "COMPOSTING", "ANAEROBIC_DIGESTION", "REUSE_REPAIR", "ENERGY_RECOVERY", "LANDFILL", "INCINERATION", "OTHER_DISPOSAL"] as const;

// ── Destinations ──

const destinationSchema = z.object({
  name: requiredText(120),
  kind: z.enum(DESTINATION_KINDS),
  registrationNumber: optionalText(80),
  wilaya: optionalText(80),
  address: optionalText(300),
});

export async function listDestinations(ctx: OrgContext, opts: { activeOnly?: boolean } = {}) {
  if (!hasPermission(ctx, "workorders.read") && !hasPermission(ctx, "reports.read")) throw new ForbiddenError("workorders.read");
  return prisma.destination.findMany({ where: { organizationId: ctx.org.id, ...(opts.activeOnly ? { active: true } : {}) }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

export async function createDestination(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "settings.manage");
  const data = parse(destinationSchema, input);
  if (await prisma.destination.findFirst({ where: { organizationId: ctx.org.id, name: data.name } })) throw new DomainError("errors.recycling.destinationExists");
  return prisma.$transaction(async (tx) => {
    const d = await tx.destination.create({ data: { ...data, organizationId: ctx.org.id } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "recycling.destination_created", entityType: "Destination", entityId: d.id, data: { kind: d.kind } });
    return d;
  });
}

export async function setDestinationActive(ctx: OrgContext, id: string, active: boolean) {
  requirePermission(ctx, "settings.manage");
  const r = await prisma.destination.updateMany({ where: { id, organizationId: ctx.org.id }, data: { active } });
  if (r.count === 0) throw new NotFoundError("Destination");
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: active ? "recycling.destination_enabled" : "recycling.destination_disabled", entityType: "Destination", entityId: id });
}

/** Shared validation for the recycling fields of a weight ticket. */
export const ticketRecyclingSchema = z.object({
  stream: z.preprocess((v) => (v === "" ? undefined : v), z.enum(STREAMS).optional()),
  destinationId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(64).optional()),
  contaminated: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
});

/** Destination must belong to the organization and be active (the composite FK enforces tenancy too). */
export async function assertDestination(tx: Pick<typeof prisma, "destination">, ctx: OrgContext, destinationId: string | undefined) {
  if (!destinationId) return null;
  const d = await tx.destination.findFirst({ where: { id: destinationId, organizationId: ctx.org.id, active: true } });
  if (!d) throw new NotFoundError("Destination");
  return d;
}

/** After the processor reports rejects for a load (e.g. contamination found at the sorting line). */
export async function recordRejects(ctx: OrgContext, ticketId: string, input: unknown) {
  requirePermission(ctx, "workorders.dispatch");
  const { rejectedKg } = parse(z.object({ rejectedKg: z.coerce.number().min(0).max(100_000) }), input);
  return prisma.$transaction(async (tx) => {
    const t = await tx.weightTicket.findFirst({ where: { id: ticketId, organizationId: ctx.org.id } });
    if (!t) throw new NotFoundError("WeightTicket");
    const rejected = toMinor(rejectedKg.toFixed(2));
    if (rejected > toMinor(t.netKg)) throw new DomainError("errors.recycling.rejectAboveNet");
    await tx.weightTicket.update({ where: { id: t.id }, data: { rejectedKg: fromMinor(rejected) } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "recycling.rejects_recorded", entityType: "WorkOrder", entityId: t.workOrderId, data: { ticketId: t.id, rejectedKg: fromMinor(rejected) } });
  });
}

// ── Reporting ──

type Filter = { from: string; to: string; customerId?: string };

async function tickets(ctx: OrgContext, f: Filter) {
  return prisma.weightTicket.findMany({
    where: {
      organizationId: ctx.org.id,
      weighedAt: { gte: dateOnly(f.from), lt: new Date(dateOnly(f.to).getTime() + 86400_000) },
      ...(f.customerId ? { workOrder: { customerId: f.customerId } } : {}),
    },
    include: {
      destination: { select: { id: true, name: true, kind: true, registrationNumber: true } },
      workOrder: { select: { id: true, number: true, customerId: true, scheduledDate: true, customer: { select: { name: true } }, wasteCategory: { select: { stream: true } }, serviceLocation: { select: { label: true } } } },
    },
    orderBy: { weighedAt: "asc" },
  });
}

type Row = Awaited<ReturnType<typeof tickets>>[number];
const streamOf = (t: Row): MaterialStream | null => t.stream ?? t.workOrder.wasteCategory?.stream ?? null;
const forRecovery = (t: Row) => ({ netMinor: toMinor(t.netKg), rejectedMinor: toMinor(t.rejectedKg), stream: streamOf(t), contaminated: t.contaminated, destinationKind: (t.destination?.kind ?? null) as DestinationKind | null });
const split = (t: Row) => splitTicket(forRecovery(t));

function summarize(rows: Row[]) {
  const total = rows.reduce((s, t) => addSplits(s, split(t)), EMPTY_SPLIT);
  const by = <K extends string>(key: (t: Row) => K | null) => {
    const m = new Map<K | "NONE", Split>();
    for (const t of rows) {
      const k = key(t) ?? "NONE";
      m.set(k, addSplits(m.get(k) ?? EMPTY_SPLIT, split(t)));
    }
    return [...m.entries()].map(([k, s]) => ({ key: k, ...s, rate: diversionRate(s) })).sort((a, b) => b.recovered + b.disposed + b.untracked - (a.recovered + a.disposed + a.untracked));
  };
  const organicElsewhere = rows.reduce((n, t) => n + organicOutsideBiological(forRecovery(t)), 0);
  return { total, rate: diversionRate(total), tickets: rows.length, organicElsewhere, byStream: by((t) => streamOf(t)), byDestination: by((t) => t.destination?.id ?? null) };
}

/** Organization-wide recovery report (reports.read). Quantities in hundredths of kg. */
export async function recoveryReport(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "reports.read");
  const f = parse(z.object({ from: isoDate, to: isoDate, customerId: optionalText(64) }), input);
  const rows = await tickets(ctx, f);
  const s = summarize(rows);
  const destinations = new Map(rows.filter((t) => t.destination).map((t) => [t.destination!.id, t.destination!]));
  const byCustomer = (() => {
    const m = new Map<string, { name: string; split: Split }>();
    for (const t of rows) {
      if (!t.workOrder.customerId) continue;
      const e = m.get(t.workOrder.customerId) ?? { name: t.workOrder.customer?.name ?? "—", split: EMPTY_SPLIT };
      e.split = addSplits(e.split, split(t));
      m.set(t.workOrder.customerId, e);
    }
    return [...m.entries()].map(([id, e]) => ({ id, name: e.name, ...e.split, rate: diversionRate(e.split) })).sort((a, b) => b.recovered - a.recovered).slice(0, 20);
  })();
  const byMonth = (() => {
    const m = new Map<string, Split>();
    for (const t of rows) {
      const k = t.weighedAt.toISOString().slice(0, 7);
      m.set(k, addSplits(m.get(k) ?? EMPTY_SPLIT, split(t)));
    }
    return [...m.entries()].sort().map(([month, s]) => ({ month, ...s, rate: diversionRate(s) }));
  })();
  return { ...s, from: f.from, to: f.to, destinations: Object.fromEntries(destinations), byCustomer, byMonth };
}

/** Ticket-level ledger for exports and audits: every number in the report traces to one of these lines. */
export async function recoveryLedger(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "reports.read");
  const f = parse(z.object({ from: isoDate, to: isoDate }), input);
  return (await tickets(ctx, f)).map((t) => ({ t, stream: streamOf(t), split: split(t) }));
}

/**
 * Attestation de valorisation for one customer and one month: tonnes per stream and destination, computed from tickets.
 * Staff with customers.read, or the customer's own portal users.
 */
export async function recoveryCertificate(ctx: OrgContext, customerId: string, month: string) {
  const portalOwn = ctx.role === "CUSTOMER_PORTAL" && ctx.customerId === customerId;
  if (!portalOwn && !hasPermission(ctx, "customers.read")) throw new ForbiddenError("customers.read");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new DomainError("errors.validation");
  const [org, customer] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id } }),
    prisma.customer.findFirst({ where: { id: customerId, organizationId: ctx.org.id } }),
  ]);
  if (!customer) throw new NotFoundError("Customer");
  const from = `${month}-01`;
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const rows = await tickets(ctx, { from, to: last, customerId });
  const s = summarize(rows);
  const destinationsUsed = [...new Map(rows.filter((t) => t.destination).map((t) => [t.destination!.id, t.destination!])).values()];
  return {
    org, customer, from, to: last, ...s, destinationsUsed,
    lines: rows.map((t) => ({ date: t.weighedAt, workOrder: t.workOrder.number, location: t.workOrder.serviceLocation?.label ?? null, stream: streamOf(t), destination: t.destination?.name ?? null, netKg: Number(t.netKg), rejectedKg: Number(t.rejectedKg), contaminated: t.contaminated })),
    reference: `VAL-${customer.code.replace(/^CUS-/, "")}-${month.replace("-", "")}`,
  };
}

/** Aggregates for the AI assistant (no names): last 30 days. */
export async function recyclingKpis(ctx: OrgContext, from: string, to: string) {
  const s = summarize(await tickets(ctx, { from, to }));
  return {
    recoveredKg: s.total.recovered / 100, energyValorisationKg: s.total.energy / 100, disposedKg: s.total.disposed / 100, untrackedKg: s.total.untracked / 100, diversionRate: s.rate,
    organicNotBiologicallyTreatedKg: s.organicElsewhere / 100,
    byStream: s.byStream.map((x) => ({ stream: x.key, recoveredKg: x.recovered / 100, totalKg: (x.recovered + x.disposed + x.untracked) / 100 })),
  };
}

/** Owner/admin classifies a waste category: stream, regulatory class, and a décret 06-104 code that must exist for that class. */
export async function classifyCategory(ctx: OrgContext, categoryId: string, input: unknown) {
  requirePermission(ctx, "settings.manage");
  const data = parse(z.object({
    stream: z.preprocess((v) => (v === "" ? null : v), z.enum(STREAMS).nullable()),
    regulatoryClass: z.enum(["HOUSEHOLD_SIMILAR", "INERT", "SPECIAL", "SPECIAL_HAZARDOUS"]),
    nomenclatureCode: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().regex(/^\d{1,2}\.\d{1,2}\.\d{1,2}$/).nullable()),
  }), input);
  // The code is only meaningful together with its class (annex II: MA/I, annex III: S/SD) — see lib/nomenclature-06-104.ts.
  if (data.nomenclatureCode && !findNomenclature(data.nomenclatureCode, CLASS_LETTER[data.regulatoryClass])) throw new DomainError("errors.recycling.codeUnknown");
  const r = await prisma.wasteCategory.updateMany({ where: { id: categoryId, organizationId: ctx.org.id }, data: { ...data, hazardous: data.regulatoryClass === "SPECIAL_HAZARDOUS" ? true : undefined } });
  if (r.count === 0) throw new NotFoundError("WasteCategory");
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "recycling.category_classified", entityType: "WasteCategory", entityId: categoryId, data });
}

export async function listCategoriesForClassification(ctx: OrgContext) {
  requirePermission(ctx, "settings.manage");
  return prisma.wasteCategory.findMany({ where: { organizationId: ctx.org.id }, orderBy: { code: "asc" } });
}
