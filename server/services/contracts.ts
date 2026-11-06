import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError, InvalidTransitionError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { dateOnly, isoDate, money, optionalText, parse, quantity, requiredText } from "../validation";
import { validTiers } from "../domain/pricing";
import { toMinor } from "@/lib/money";
import type { ContractStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

const lineSchema = z.object({
  serviceLocationId: z.string().min(1),
  wasteCategoryId: z.string().min(1),
  frequency: z.enum(["ON_DEMAND", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  weekdays: z.array(z.coerce.number().int().min(1).max(7)).max(7).default([]),
  billingUnit: z.enum(["PER_COLLECTION", "PER_TONNE", "PER_MONTH"]),
  unitPrice: money,
  estimatedQuantity: z.preprocess((v) => (v === "" ? undefined : v), quantity.optional()),
});

const contractSchema = z
  .object({
    customerId: z.string().min(1),
    title: requiredText(160),
    reference: optionalText(40),
    startDate: isoDate,
    endDate: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
    renewalNoticeDays: z.coerce.number().int().min(0).max(365).default(30),
    autoRenew: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
    serviceScope: optionalText(4000),
    slaResponseHours: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1).max(720).optional()),
    lines: z.array(lineSchema).min(1).max(50),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, { path: ["endDate"], message: "afterStart" });

export async function listContracts(ctx: OrgContext, opts: { status?: ContractStatus } = {}) {
  requirePermission(ctx, "contracts.read");
  return prisma.contract.findMany({
    where: { organizationId: ctx.org.id, status: opts.status },
    include: { customer: { select: { name: true } }, _count: { select: { lines: true } } },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
    take: 300,
  });
}

export async function getContract(ctx: OrgContext, contractId: string) {
  requirePermission(ctx, "contracts.read");
  const c = await prisma.contract.findFirst({
    where: { id: contractId, organizationId: ctx.org.id },
    include: {
      customer: true,
      lines: { include: { serviceLocation: true, wasteCategory: true } },
      surcharges: { where: { active: true }, orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) throw new NotFoundError("Contract");
  const history = await prisma.auditEvent.findMany({
    where: { organizationId: ctx.org.id, entityType: "Contract", entityId: contractId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { ...c, history };
}

export async function createContract(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "contracts.write");
  const data = parse(contractSchema, input);
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: data.customerId, organizationId: ctx.org.id } });
    if (!customer) throw new NotFoundError("Customer");
    // Every line must reference this customer's locations and this organization's categories.
    const locIds = [...new Set(data.lines.map((l) => l.serviceLocationId))];
    const catIds = [...new Set(data.lines.map((l) => l.wasteCategoryId))];
    const [locCount, catCount] = await Promise.all([
      tx.serviceLocation.count({ where: { id: { in: locIds }, organizationId: ctx.org.id, customerId: customer.id } }),
      tx.wasteCategory.count({ where: { id: { in: catIds }, organizationId: ctx.org.id } }),
    ]);
    if (locCount !== locIds.length) throw new DomainError("errors.contract.locationMismatch");
    if (catCount !== catIds.length) throw new NotFoundError("WasteCategory");

    const reference = data.reference ?? `CTR-${new Date().getUTCFullYear()}-${customer.code.replace(/^CUS-/, "")}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const exists = await tx.contract.findFirst({ where: { organizationId: ctx.org.id, reference } });
    if (exists) throw new DomainError("errors.contract.referenceTaken");

    const contract = await tx.contract.create({
      data: {
        organizationId: ctx.org.id,
        customerId: customer.id,
        reference,
        title: data.title,
        startDate: dateOnly(data.startDate),
        endDate: data.endDate ? dateOnly(data.endDate) : null,
        renewalNoticeDays: data.renewalNoticeDays,
        autoRenew: data.autoRenew,
        serviceScope: data.serviceScope,
        slaResponseHours: data.slaResponseHours,
        createdById: ctx.userId,
      },
    });
    await tx.contractServiceLine.createMany({
      data: data.lines.map((l) => ({
        organizationId: ctx.org.id,
        contractId: contract.id,
        serviceLocationId: l.serviceLocationId,
        wasteCategoryId: l.wasteCategoryId,
        frequency: l.frequency,
        weekdays: l.weekdays,
        billingUnit: l.billingUnit,
        unitPrice: l.unitPrice,
        estimatedQuantity: l.estimatedQuantity,
      })),
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "contract.created", entityType: "Contract", entityId: contract.id, data: { reference } });
    return contract;
  });
}

const CONTRACT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  DRAFT: ["ACTIVE", "TERMINATED"],
  ACTIVE: ["SUSPENDED", "TERMINATED", "EXPIRED"],
  SUSPENDED: ["ACTIVE", "TERMINATED"],
  EXPIRED: ["ACTIVE"],
  TERMINATED: [],
};

export function canTransitionContract(from: ContractStatus, to: ContractStatus) {
  return CONTRACT_TRANSITIONS[from].includes(to);
}

export async function setContractStatus(ctx: OrgContext, contractId: string, to: ContractStatus) {
  requirePermission(ctx, "contracts.write");
  return prisma.$transaction(async (tx) => {
    const c = await tx.contract.findFirst({ where: { id: contractId, organizationId: ctx.org.id } });
    if (!c) throw new NotFoundError("Contract");
    if (!canTransitionContract(c.status, to)) throw new InvalidTransitionError("Contract", c.status, to);
    await tx.contract.update({ where: { id: c.id }, data: { status: to } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "contract.status_changed", entityType: "Contract", entityId: c.id, data: { from: c.status, to } });
  });
}

/** Active contracts whose end date falls within their renewal-notice window. */
export async function contractsDueForRenewal(ctx: OrgContext, today = new Date()) {
  requirePermission(ctx, "contracts.read");
  const contracts = await prisma.contract.findMany({
    where: { organizationId: ctx.org.id, status: "ACTIVE", endDate: { not: null } },
    include: { customer: { select: { name: true } } },
    orderBy: { endDate: "asc" },
  });
  return contracts.filter((c) => c.endDate && c.endDate.getTime() - today.getTime() <= c.renewalNoticeDays * 86400_000);
}

// ── Pricing terms (D-90): tonnage tiers and minimum charge on PER_TONNE lines, surcharges per contract ──

const blank = (v: unknown) => (v === "" || v === null ? undefined : v);
const pricingSchema = z.object({
  minimumCharge: z.preprocess(blank, money.optional()),
  tiers: z
    .array(z.object({ aboveTonnes: z.preprocess(blank, quantity.optional()), unitPrice: z.preprocess(blank, money.optional()) }))
    .max(5)
    .default([]),
});

/** Stored tiers: thresholds in kg, prices as decimal strings. Rows left empty in the form are ignored. */
export type StoredTier = { aboveKg: number; unitPrice: string };

export function readTiers(json: unknown): StoredTier[] {
  if (!Array.isArray(json)) return [];
  return json.filter((t): t is StoredTier => !!t && typeof t === "object" && typeof (t as StoredTier).aboveKg === "number" && typeof (t as StoredTier).unitPrice === "string");
}

/**
 * Sets the minimum charge and tonnage tiers of a PER_TONNE line. Applies to work not yet invoiced (pricing happens when
 * the draft invoice is made); invoices already drafted or issued keep their amounts.
 */
export async function setLinePricing(ctx: OrgContext, lineId: string, input: unknown) {
  requirePermission(ctx, "contracts.write");
  const data = parse(pricingSchema, input);
  const rows = data.tiers.filter((t) => t.aboveTonnes || t.unitPrice);
  if (rows.some((t) => !t.aboveTonnes || !t.unitPrice)) throw new DomainError("errors.validation", { fields: { tiers: "incomplete" } });
  const tiers: StoredTier[] = rows.map((t) => ({ aboveKg: Math.round(Number(t.aboveTonnes) * 1000), unitPrice: String(t.unitPrice) }));
  if (!validTiers(tiers.map((t) => ({ aboveKg: t.aboveKg, unitPriceMinor: toMinor(t.unitPrice) })))) throw new DomainError("errors.validation", { fields: { tiers: "order" } });
  return prisma.$transaction(async (tx) => {
    const line = await tx.contractServiceLine.findFirst({ where: { id: lineId, organizationId: ctx.org.id } });
    if (!line) throw new NotFoundError("ContractServiceLine");
    if (line.billingUnit !== "PER_TONNE") throw new DomainError("errors.contract.tiersPerTonneOnly");
    await tx.contractServiceLine.update({ where: { id: line.id }, data: { minimumCharge: data.minimumCharge ?? null, tiers: tiers.length ? tiers : Prisma.DbNull } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "contract.pricing_changed", entityType: "Contract", entityId: line.contractId, data: { lineId: line.id, minimumCharge: data.minimumCharge ?? null, tiers } });
  });
}

const surchargeSchema = z.object({
  label: requiredText(80),
  kind: z.enum(["PERCENT", "PER_COLLECTION"]),
  value: money,
}).refine((d) => Number(d.value) > 0 && (d.kind !== "PERCENT" || Number(d.value) <= 100), { path: ["value"], message: "range" });

export async function addSurcharge(ctx: OrgContext, contractId: string, input: unknown) {
  requirePermission(ctx, "contracts.write");
  const data = parse(surchargeSchema, input);
  return prisma.$transaction(async (tx) => {
    const c = await tx.contract.findFirst({ where: { id: contractId, organizationId: ctx.org.id }, select: { id: true } });
    if (!c) throw new NotFoundError("Contract");
    const sc = await tx.contractSurcharge.create({ data: { organizationId: ctx.org.id, contractId: c.id, label: data.label, kind: data.kind, value: data.value, createdById: ctx.userId } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "contract.surcharge_added", entityType: "Contract", entityId: c.id, data: { surchargeId: sc.id, label: data.label, kind: data.kind, value: data.value } });
    return sc;
  });
}

/** Surcharges are switched off, never deleted: invoices already made keep their lines and the audit trail its reference. */
export async function removeSurcharge(ctx: OrgContext, surchargeId: string) {
  requirePermission(ctx, "contracts.write");
  return prisma.$transaction(async (tx) => {
    const sc = await tx.contractSurcharge.findFirst({ where: { id: surchargeId, organizationId: ctx.org.id, active: true } });
    if (!sc) throw new NotFoundError("ContractSurcharge");
    await tx.contractSurcharge.update({ where: { id: sc.id }, data: { active: false } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "contract.surcharge_removed", entityType: "Contract", entityId: sc.contractId, data: { surchargeId: sc.id, label: sc.label } });
  });
}
