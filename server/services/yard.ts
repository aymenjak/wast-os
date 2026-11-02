import { z } from "zod";
import { prisma, type Db } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { dateOnly, isoDate, optionalText, parse, requiredText } from "../validation";
import { toMinor, fromMinor } from "@/lib/money";
import { STREAMS } from "./recycling";
import type { MaterialStream } from "@/lib/generated/prisma/enums";

/**
 * R2 — sorting yard (RECYCLING.md §3): buying from collectors, bales, bulk stock, sales to recyclers, mass balance.
 *
 * Quantities are integer hundredths of a kg ("minor kg"), money integer centimes. Prices are ALWAYS entered by the operator
 * (no reliable public price series exists — RECYCLING.md §1.3). Bulk stock per (yard, stream) is derived, never stored:
 *   + net − rejects of weight tickets delivered to the yard (own collections)
 *   + net of purchase lines (non-voided purchases)
 *   + OPENING and signed CORRECTION adjustments − REJECT adjustments
 *   − bales made (any status except VOID) − loose sale lines (non-cancelled sales)
 * and may never go negative: every operation that consumes stock runs under a per-yard advisory lock.
 */

const kg = z.coerce.number().positive().max(1_000_000);
const price = z.coerce.number().min(0).max(1_000_000); // DZD per kg as typed
const toCentimes = (dzd: number) => Math.round(dzd * 100);
const lineAmount = (weightMinor: number, centimesPerKg: number) => BigInt(Math.round((weightMinor * centimesPerKg) / 100));

function canRead(ctx: OrgContext) {
  if (!hasPermission(ctx, "workorders.read") && !hasPermission(ctx, "reports.read") && !hasPermission(ctx, "invoices.read")) throw new ForbiddenError("reports.read");
}

async function yardOf(db: Db, ctx: OrgContext, yardId: string) {
  const y = await db.destination.findFirst({ where: { id: yardId, organizationId: ctx.org.id, ownYard: true } });
  if (!y) throw new NotFoundError("Destination");
  return y;
}

/** Serialises stock-consuming operations of one yard inside the current transaction. */
async function lockYard(tx: Db, yardId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`yard:${yardId}`}))`;
}

export async function listYards(ctx: OrgContext) {
  canRead(ctx);
  return prisma.destination.findMany({ where: { organizationId: ctx.org.id, ownYard: true }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

// ───────────────────────────── Stock ─────────────────────────────

type StreamMap = Map<MaterialStream, number>;
const add = (m: StreamMap, s: MaterialStream | null, v: number) => { if (s) m.set(s, (m.get(s) ?? 0) + v); };

async function flows(db: Db, orgId: string, yardId: string, range?: { from: Date; to: Date }) {
  const at = (col: string) => (range ? `AND ${col} >= $3 AND ${col} < $4` : "");
  const args: unknown[] = range ? [orgId, yardId, range.from, range.to] : [orgId, yardId];
  type R = { stream: MaterialStream | null; minor: string | null };
  const q = (sql: string) => db.$queryRawUnsafe<R[]>(sql, ...args);
  const [collected, purchased, adjustments, baled, looseSold, unclassified] = await Promise.all([
    q(`SELECT COALESCE(t.stream, c.stream) AS stream, SUM((t."netKg" - t."rejectedKg") * 100)::text AS minor
         FROM "WeightTicket" t JOIN "WorkOrder" w ON w.id = t."workOrderId" LEFT JOIN "WasteCategory" c ON c.id = w."wasteCategoryId"
        WHERE t."organizationId" = $1 AND t."destinationId" = $2 ${at('t."weighedAt"')} GROUP BY 1`),
    q(`SELECT l.stream, SUM(l."netKg" * 100)::text AS minor FROM "MaterialPurchaseLine" l JOIN "MaterialPurchase" p ON p.id = l."purchaseId"
        WHERE p."organizationId" = $1 AND p."yardId" = $2 AND p."voidedAt" IS NULL ${at('p."purchasedAt"')} GROUP BY 1`),
    db.$queryRawUnsafe<{ stream: MaterialStream; kind: string; minor: string }[]>(
      `SELECT stream, kind::text, SUM(kg * 100)::text AS minor FROM "YardAdjustment" WHERE "organizationId" = $1 AND "yardId" = $2 ${at('"createdAt"')} GROUP BY 1, 2`, ...args),
    q(`SELECT stream, SUM("weightKg" * 100)::text AS minor FROM "Bale" WHERE "organizationId" = $1 AND "yardId" = $2 AND status <> 'VOID' ${at('"createdAt"')} GROUP BY 1`),
    q(`SELECT l.stream, SUM(l."weightKg" * 100)::text AS minor FROM "MaterialSaleLine" l JOIN "MaterialSale" s ON s.id = l."saleId"
        WHERE s."organizationId" = $1 AND s."yardId" = $2 AND s.status <> 'CANCELLED' AND l."baleId" IS NULL ${at('s."createdAt"')} GROUP BY 1`),
    q(`SELECT NULL::"MaterialStream" AS stream, SUM((t."netKg" - t."rejectedKg") * 100)::text AS minor
         FROM "WeightTicket" t JOIN "WorkOrder" w ON w.id = t."workOrderId" LEFT JOIN "WasteCategory" c ON c.id = w."wasteCategoryId"
        WHERE t."organizationId" = $1 AND t."destinationId" = $2 AND t.stream IS NULL AND c.stream IS NULL ${at('t."weighedAt"')}`),
  ]);
  const map = (rows: R[]) => { const m: StreamMap = new Map(); for (const r of rows) add(m, r.stream, Math.round(Number(r.minor ?? 0))); return m; };
  const adj = { opening: new Map() as StreamMap, reject: new Map() as StreamMap, correction: new Map() as StreamMap };
  for (const a of adjustments) add(a.kind === "OPENING" ? adj.opening : a.kind === "REJECT" ? adj.reject : adj.correction, a.stream, Math.round(Number(a.minor)));
  return { collected: map(collected), purchased: map(purchased), ...adj, baled: map(baled), looseSold: map(looseSold), unclassifiedMinor: Math.round(Number(unclassified[0]?.minor ?? 0)) };
}

async function bulkStock(db: Db, orgId: string, yardId: string): Promise<StreamMap> {
  const f = await flows(db, orgId, yardId);
  const out: StreamMap = new Map();
  for (const s of STREAMS) {
    const v = (f.collected.get(s) ?? 0) + (f.purchased.get(s) ?? 0) + (f.opening.get(s) ?? 0) + (f.correction.get(s) ?? 0) - (f.reject.get(s) ?? 0) - (f.baled.get(s) ?? 0) - (f.looseSold.get(s) ?? 0);
    if (v !== 0) out.set(s, v);
  }
  return out;
}

async function assertAvailable(tx: Db, ctx: OrgContext, yardId: string, needs: StreamMap) {
  const stock = await bulkStock(tx, ctx.org.id, yardId);
  for (const [s, need] of needs) if ((stock.get(s) ?? 0) < need) throw new DomainError("errors.yard.insufficientStock", { stream: s, availableKg: (stock.get(s) ?? 0) / 100 });
}

export async function yardStock(ctx: OrgContext, yardId: string) {
  canRead(ctx);
  await yardOf(prisma, ctx, yardId);
  const [bulk, bales] = await Promise.all([
    bulkStock(prisma, ctx.org.id, yardId),
    prisma.bale.findMany({ where: { organizationId: ctx.org.id, yardId, status: "IN_STOCK" }, orderBy: { createdAt: "desc" } }),
  ]);
  const rows = STREAMS.map((s) => {
    const own = bales.filter((b) => b.stream === s);
    return { stream: s, bulkKg: (bulk.get(s) ?? 0) / 100, bales: own.length, balesKg: own.reduce((n, b) => n + toMinor(b.weightKg), 0) / 100 };
  }).filter((r) => r.bulkKg !== 0 || r.bales > 0);
  return { rows, bales: bales.map((b) => ({ ...b, weightKg: Number(b.weightKg) })) };
}

// ───────────────────────────── Suppliers ─────────────────────────────

export async function createSupplier(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const d = parse(z.object({ name: requiredText(120), kind: z.enum(["INDIVIDUAL", "COMPANY"]), phone: optionalText(30), registrationNumber: optionalText(80) }), input);
  // Law 18-07 minimisation: individuals carry no registration number.
  const s = await prisma.materialSupplier.create({ data: { ...d, registrationNumber: d.kind === "COMPANY" ? d.registrationNumber : null, organizationId: ctx.org.id } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.supplier_created", entityType: "MaterialSupplier", entityId: s.id, data: { kind: s.kind } });
  return s;
}

export async function listSuppliers(ctx: OrgContext) {
  requirePermission(ctx, "invoices.read");
  return prisma.materialSupplier.findMany({ where: { organizationId: ctx.org.id }, orderBy: [{ active: "desc" }, { name: "asc" }] });
}

// ───────────────────────────── Purchases ─────────────────────────────

const lineSchema = z.object({ stream: z.enum(STREAMS), grade: optionalText(40), grossKg: kg, tareKg: z.preprocess((v) => (v === "" || v === undefined ? 0 : v), z.coerce.number().min(0).max(1_000_000)), unitPrice: price });

/** Lines with an empty weight are ignored (the form shows several rows). */
const looseLines = (v: unknown) => (Array.isArray(v) ? v.filter((l) => l && typeof l === "object" && String((l as Record<string, unknown>).grossKg ?? "").trim() !== "") : v);

export async function createPurchase(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const d = parse(z.object({ yardId: requiredText(64), supplierId: requiredText(64), paid: z.preprocess((v) => v === "on" || v === true, z.boolean()), lines: z.preprocess(looseLines, z.array(lineSchema).min(1).max(20)) }), input);
  return prisma.$transaction(async (tx) => {
    await yardOf(tx, ctx, d.yardId);
    const supplier = await tx.materialSupplier.findFirst({ where: { id: d.supplierId, organizationId: ctx.org.id, active: true } });
    if (!supplier) throw new NotFoundError("MaterialSupplier");
    const lines = d.lines.map((l) => {
      const gross = toMinor(l.grossKg.toFixed(2)), tare = toMinor(l.tareKg.toFixed(2));
      if (tare >= gross) throw new DomainError("errors.yard.tareAboveGross");
      const cents = toCentimes(l.unitPrice);
      return { stream: l.stream, grade: l.grade, grossKg: fromMinor(gross), tareKg: fromMinor(tare), netKg: fromMinor(gross - tare), unitPriceMinorPerKg: cents, amountMinor: lineAmount(gross - tare, cents) };
    });
    const total = lines.reduce((n, l) => n + l.amountMinor, 0n);
    const number = await nextNumber(tx, ctx.org.id, "purchase", "ACH");
    const p = await tx.materialPurchase.create({
      data: { organizationId: ctx.org.id, number, yardId: d.yardId, supplierId: supplier.id, totalMinor: total, paidAt: d.paid ? new Date() : null, createdById: ctx.userId, lines: { create: lines } },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.purchase_created", entityType: "MaterialPurchase", entityId: p.id, data: { number, total: total.toString(), lines: lines.length } });
    return p;
  });
}

export async function markPurchasePaid(ctx: OrgContext, id: string) {
  requirePermission(ctx, "payments.record");
  const r = await prisma.materialPurchase.updateMany({ where: { id, organizationId: ctx.org.id, paidAt: null, voidedAt: null }, data: { paidAt: new Date() } });
  if (r.count !== 1) throw new DomainError("errors.invalidTransition", { entity: "MaterialPurchase" });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.purchase_paid", entityType: "MaterialPurchase", entityId: id });
}

/** Voiding removes the material from stock, so it is refused if that material has already been baled or sold. */
export async function voidPurchase(ctx: OrgContext, id: string, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const { voidReason } = parse(z.object({ voidReason: requiredText(300) }), input);
  await prisma.$transaction(async (tx) => {
    const p = await tx.materialPurchase.findFirst({ where: { id, organizationId: ctx.org.id, voidedAt: null }, include: { lines: true } });
    if (!p) throw new NotFoundError("MaterialPurchase");
    await lockYard(tx, p.yardId);
    const needs: StreamMap = new Map();
    for (const l of p.lines) add(needs, l.stream, toMinor(l.netKg));
    await assertAvailable(tx, ctx, p.yardId, needs);
    await tx.materialPurchase.update({ where: { id: p.id }, data: { voidedAt: new Date(), voidReason } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.purchase_voided", entityType: "MaterialPurchase", entityId: p.id, data: { voidReason } });
  });
}

export async function listPurchases(ctx: OrgContext, yardId?: string) {
  requirePermission(ctx, "invoices.read");
  return prisma.materialPurchase.findMany({
    where: { organizationId: ctx.org.id, ...(yardId ? { yardId } : {}) },
    include: { supplier: { select: { name: true } }, lines: { select: { stream: true, netKg: true } } },
    orderBy: { purchasedAt: "desc" }, take: 200,
  });
}

export async function getPurchase(ctx: OrgContext, id: string) {
  requirePermission(ctx, "invoices.read");
  return prisma.materialPurchase.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: { supplier: true, yard: { select: { name: true, address: true, wilaya: true } }, lines: true, organization: { select: { name: true, legalName: true, address: true, taxId: true, tradeRegister: true } } },
  });
}

// ───────────────────────────── Bales and adjustments ─────────────────────────────

export async function createBale(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "workorders.dispatch");
  const d = parse(z.object({ yardId: requiredText(64), stream: z.enum(STREAMS), grade: optionalText(40), weightKg: kg }), input);
  const w = toMinor(d.weightKg.toFixed(2));
  return prisma.$transaction(async (tx) => {
    await yardOf(tx, ctx, d.yardId);
    await lockYard(tx, d.yardId);
    await assertAvailable(tx, ctx, d.yardId, new Map([[d.stream, w]]));
    const number = await nextNumber(tx, ctx.org.id, "bale", "BAL");
    const b = await tx.bale.create({ data: { organizationId: ctx.org.id, number, yardId: d.yardId, stream: d.stream, grade: d.grade, weightKg: fromMinor(w), createdById: ctx.userId } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.bale_created", entityType: "Bale", entityId: b.id, data: { number, stream: d.stream, kg: d.weightKg } });
    return b;
  });
}

/** A bale broken up again: its weight returns to bulk stock. */
export async function voidBale(ctx: OrgContext, id: string) {
  requirePermission(ctx, "workorders.dispatch");
  const r = await prisma.bale.updateMany({ where: { id, organizationId: ctx.org.id, status: "IN_STOCK", saleId: null }, data: { status: "VOID" } });
  if (r.count !== 1) throw new DomainError("errors.invalidTransition", { entity: "Bale" });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.bale_voided", entityType: "Bale", entityId: id });
}

export async function addAdjustment(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "workorders.dispatch");
  const d = parse(z.object({ yardId: requiredText(64), stream: z.enum(STREAMS), kind: z.enum(["OPENING", "REJECT", "CORRECTION"]), kg: z.coerce.number().refine((v) => v !== 0 && Math.abs(v) <= 1_000_000), reason: requiredText(300) }), input);
  if (d.kind !== "CORRECTION" && d.kg < 0) throw new DomainError("errors.validation", { fields: { kg: "invalid" } });
  const m = toMinor(d.kg.toFixed(2));
  return prisma.$transaction(async (tx) => {
    await yardOf(tx, ctx, d.yardId);
    await lockYard(tx, d.yardId);
    const removes = d.kind === "REJECT" ? m : d.kind === "CORRECTION" && m < 0 ? -m : 0;
    if (removes > 0) await assertAvailable(tx, ctx, d.yardId, new Map([[d.stream, removes]]));
    const a = await tx.yardAdjustment.create({ data: { organizationId: ctx.org.id, yardId: d.yardId, stream: d.stream, kind: d.kind, kg: fromMinor(m), reason: d.reason, createdById: ctx.userId } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.adjustment", entityType: "YardAdjustment", entityId: a.id, data: { kind: d.kind, stream: d.stream, kg: d.kg } });
    return a;
  });
}

export async function getBale(ctx: OrgContext, id: string) {
  canRead(ctx);
  return prisma.bale.findFirst({ where: { id, organizationId: ctx.org.id }, include: { yard: { select: { name: true } }, organization: { select: { name: true, legalName: true } } } });
}

// ───────────────────────────── Sales ─────────────────────────────

export async function createSale(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const d = parse(z.object({
    yardId: requiredText(64),
    buyerId: requiredText(64),
    baleIds: z.array(z.string().max(64)).max(200).default([]),
    loose: z.preprocess((v) => (Array.isArray(v) ? v.filter((l) => l && String((l as Record<string, unknown>).weightKg ?? "").trim() !== "") : []), z.array(z.object({ stream: z.enum(STREAMS), grade: optionalText(40), weightKg: kg })).max(20)),
    /** Price per kg by stream, as typed (DZD). */
    prices: z.record(z.string(), z.preprocess((v) => (v === "" ? undefined : v), price.optional())).default({}),
  }), input);
  if (d.baleIds.length === 0 && d.loose.length === 0) throw new DomainError("errors.yard.emptySale");
  return prisma.$transaction(async (tx) => {
    await yardOf(tx, ctx, d.yardId);
    const buyer = await tx.destination.findFirst({ where: { id: d.buyerId, organizationId: ctx.org.id, active: true, ownYard: false } });
    if (!buyer) throw new NotFoundError("Destination");
    await lockYard(tx, d.yardId);
    const bales = d.baleIds.length ? await tx.bale.findMany({ where: { id: { in: d.baleIds }, organizationId: ctx.org.id, yardId: d.yardId, status: "IN_STOCK", saleId: null } }) : [];
    if (bales.length !== new Set(d.baleIds).size) throw new DomainError("errors.yard.baleUnavailable");
    const needs: StreamMap = new Map();
    for (const l of d.loose) add(needs, l.stream, toMinor(l.weightKg.toFixed(2)));
    await assertAvailable(tx, ctx, d.yardId, needs);
    const priceOf = (s: MaterialStream) => {
      const p = d.prices[s];
      if (p === undefined) throw new DomainError("errors.yard.priceMissing", { stream: s });
      return toCentimes(p);
    };
    const lines = [
      ...bales.map((b) => ({ stream: b.stream, grade: b.grade, baleId: b.id, weightMinor: toMinor(b.weightKg) })),
      ...d.loose.map((l) => ({ stream: l.stream, grade: l.grade ?? null, baleId: null, weightMinor: toMinor(l.weightKg.toFixed(2)) })),
    ].map((l) => { const c = priceOf(l.stream); return { stream: l.stream, grade: l.grade, baleId: l.baleId, weightKg: fromMinor(l.weightMinor), unitPriceMinorPerKg: c, amountMinor: lineAmount(l.weightMinor, c) }; });
    const total = lines.reduce((n, l) => n + l.amountMinor, 0n);
    const number = await nextNumber(tx, ctx.org.id, "sale", "VTE");
    const sale = await tx.materialSale.create({ data: { organizationId: ctx.org.id, number, yardId: d.yardId, buyerId: buyer.id, totalMinor: total, createdById: ctx.userId, lines: { create: lines } } });
    if (bales.length) {
      const r = await tx.bale.updateMany({ where: { id: { in: bales.map((b) => b.id) }, organizationId: ctx.org.id, status: "IN_STOCK", saleId: null }, data: { status: "SOLD", saleId: sale.id } });
      if (r.count !== bales.length) throw new DomainError("errors.yard.baleUnavailable");
    }
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.sale_created", entityType: "MaterialSale", entityId: sale.id, data: { number, bales: bales.length, loose: d.loose.length, total: total.toString() } });
    return sale;
  });
}

async function saleFor(ctx: OrgContext, id: string) {
  const s = await prisma.materialSale.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!s) throw new NotFoundError("MaterialSale");
  return s;
}

export async function deliverSale(ctx: OrgContext, id: string, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const d = parse(z.object({ buyerWeighedKg: z.preprocess((v) => (v === "" ? undefined : v), kg.optional()) }), input);
  const s = await saleFor(ctx, id);
  if (s.status !== "DRAFT") throw new DomainError("errors.invalidTransition", { entity: "MaterialSale", from: s.status, to: "DELIVERED" });
  await prisma.materialSale.updateMany({ where: { id, organizationId: ctx.org.id, status: "DRAFT" }, data: { status: "DELIVERED", deliveredAt: new Date(), buyerWeighedKg: d.buyerWeighedKg !== undefined ? fromMinor(toMinor(d.buyerWeighedKg.toFixed(2))) : null } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.sale_delivered", entityType: "MaterialSale", entityId: id });
}

/** Quality claim by the buyer (moisture, contamination…): a weight and/or amount deduction with a reason. */
export async function recordClaim(ctx: OrgContext, id: string, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const d = parse(z.object({
    claimKg: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).max(1_000_000).optional()),
    claimAmount: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).max(1_000_000_000).optional()),
    claimReason: requiredText(300),
  }), input);
  if (d.claimKg === undefined && d.claimAmount === undefined) throw new DomainError("errors.validation", { fields: { claimAmount: "required" } });
  const s = await saleFor(ctx, id);
  if (s.status !== "DELIVERED") throw new DomainError("errors.invalidTransition", { entity: "MaterialSale", from: s.status, to: "CLAIM" });
  const amount = d.claimAmount !== undefined ? BigInt(toCentimes(d.claimAmount)) : null;
  if (amount !== null && amount > s.totalMinor) throw new DomainError("errors.yard.claimAboveTotal");
  await prisma.materialSale.update({ where: { id: s.id }, data: { claimKg: d.claimKg !== undefined ? fromMinor(toMinor(d.claimKg.toFixed(2))) : null, claimAmountMinor: amount, claimReason: d.claimReason } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.sale_claim", entityType: "MaterialSale", entityId: id, data: { claimKg: d.claimKg, claimAmount: d.claimAmount } });
}

export async function settleSale(ctx: OrgContext, id: string) {
  requirePermission(ctx, "payments.record");
  const r = await prisma.materialSale.updateMany({ where: { id, organizationId: ctx.org.id, status: "DELIVERED" }, data: { status: "SETTLED", settledAt: new Date() } });
  if (r.count !== 1) throw new DomainError("errors.invalidTransition", { entity: "MaterialSale" });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.sale_settled", entityType: "MaterialSale", entityId: id });
}

/** Only drafts can be cancelled; their bales go back to stock. */
export async function cancelSale(ctx: OrgContext, id: string) {
  requirePermission(ctx, "invoices.write");
  await prisma.$transaction(async (tx) => {
    const r = await tx.materialSale.updateMany({ where: { id, organizationId: ctx.org.id, status: "DRAFT" }, data: { status: "CANCELLED" } });
    if (r.count !== 1) throw new DomainError("errors.invalidTransition", { entity: "MaterialSale" });
    await tx.bale.updateMany({ where: { organizationId: ctx.org.id, saleId: id }, data: { status: "IN_STOCK", saleId: null } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "yard.sale_cancelled", entityType: "MaterialSale", entityId: id });
  });
}

export async function listSales(ctx: OrgContext, yardId?: string) {
  requirePermission(ctx, "invoices.read");
  return prisma.materialSale.findMany({ where: { organizationId: ctx.org.id, ...(yardId ? { yardId } : {}) }, include: { buyer: { select: { name: true } }, lines: { select: { weightKg: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
}

export async function getSale(ctx: OrgContext, id: string) {
  requirePermission(ctx, "invoices.read");
  return prisma.materialSale.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      buyer: true, yard: { select: { name: true, address: true, wilaya: true } }, lines: true,
      bales: { select: { id: true, number: true } },
      organization: { select: { name: true, legalName: true, address: true, taxId: true, tradeRegister: true } },
    },
  });
}

// ───────────────────────────── Report: mass balance and margin ─────────────────────────────

/**
 * Per stream over a period: inbound (own collections, purchases, opening), outbound (bales made, rejects, sold), revenue
 * net of claims, and an ESTIMATED margin = revenue − sold kg × weighted average material cost of the period's inbound
 * (purchases at their price, own collections at zero material cost; transport, labour and energy are not included).
 */
export async function yardReport(ctx: OrgContext, yardId: string, input: unknown) {
  requirePermission(ctx, "reports.read");
  const f = parse(z.object({ from: isoDate, to: isoDate }), input);
  await yardOf(prisma, ctx, yardId);
  const range = { from: dateOnly(f.from), to: new Date(dateOnly(f.to).getTime() + 86400_000) };
  const fl = await flows(prisma, ctx.org.id, yardId, range);
  const [purchaseCost, sales] = await Promise.all([
    prisma.$queryRaw<{ stream: MaterialStream; cost: string }[]>`
      SELECT l.stream, SUM(l."amountMinor")::text AS cost FROM "MaterialPurchaseLine" l JOIN "MaterialPurchase" p ON p.id = l."purchaseId"
       WHERE p."organizationId" = ${ctx.org.id} AND p."yardId" = ${yardId} AND p."voidedAt" IS NULL AND p."purchasedAt" >= ${range.from} AND p."purchasedAt" < ${range.to} GROUP BY 1`,
    prisma.materialSale.findMany({
      where: { organizationId: ctx.org.id, yardId, status: { in: ["DELIVERED", "SETTLED"] }, deliveredAt: { gte: range.from, lt: range.to } },
      include: { lines: true },
    }),
  ]);
  const cost = new Map(purchaseCost.map((r) => [r.stream, Number(r.cost)]));
  const soldKg: StreamMap = new Map(), revenue: StreamMap = new Map();
  for (const s of sales) {
    const total = Number(s.totalMinor), claim = Number(s.claimAmountMinor ?? 0n);
    for (const l of s.lines) {
      add(soldKg, l.stream, toMinor(l.weightKg));
      // A claim is spread over the sale's lines in proportion to their amounts.
      add(revenue, l.stream, Number(l.amountMinor) - (total > 0 ? Math.round((claim * Number(l.amountMinor)) / total) : 0));
    }
  }
  const rows = STREAMS.map((s) => {
    const collected = fl.collected.get(s) ?? 0, purchased = fl.purchased.get(s) ?? 0, opening = fl.opening.get(s) ?? 0;
    const inbound = collected + purchased;
    const avgCostPerKgMinor = inbound > 0 ? ((cost.get(s) ?? 0) * 100) / inbound : null; // centimes per kg
    const sold = soldKg.get(s) ?? 0, rev = revenue.get(s) ?? 0;
    const estCost = avgCostPerKgMinor === null ? null : Math.round((sold * avgCostPerKgMinor) / 100);
    return {
      stream: s, collectedKg: collected / 100, purchasedKg: purchased / 100, openingKg: opening / 100, correctionKg: (fl.correction.get(s) ?? 0) / 100,
      baledKg: (fl.baled.get(s) ?? 0) / 100, rejectKg: (fl.reject.get(s) ?? 0) / 100, soldKg: sold / 100,
      purchaseCost: (cost.get(s) ?? 0) / 100, revenue: rev / 100, estimatedCost: estCost === null ? null : estCost / 100, estimatedMargin: estCost === null ? null : (rev - estCost) / 100,
      rejectRate: inbound > 0 ? (fl.reject.get(s) ?? 0) / inbound : null,
    };
  }).filter((r) => r.collectedKg || r.purchasedKg || r.openingKg || r.baledKg || r.rejectKg || r.soldKg || r.correctionKg);
  return { from: f.from, to: f.to, rows, unclassifiedInboundKg: fl.unclassifiedMinor / 100 };
}
