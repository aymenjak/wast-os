import { z } from "zod";
import { prisma, type Db, type Tx } from "../db";
import { hasPermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { dateOnly, isoDate, money, optionalText, parse, quantity, requiredText } from "../validation";
import { toMinor } from "@/lib/money";
import { averageCost, isLow, outgoingValue, receiptValue, type Balance } from "../domain/stock";
import { orgToday } from "./reports";
import type { StockCategory, StockMovementKind, StockUnit } from "@/lib/generated/prisma/enums";

/**
 * Stock & procurement of operating supplies (STOCK.md): spare parts, lubricants, tyres, cleaning products, protective
 * equipment, consumables. Recovered materials are tracked by the sorting yard, not here.
 *
 * The ledger (StockMovement) is append-only; the quantity and value on hand are sums over it. Valuation at weighted
 * average cost (server/domain/stock.ts). Stock can never go negative: every movement that takes stock out runs under a
 * per-item advisory lock and re-reads the balance inside the transaction.
 *
 * Permissions: read = fleet.read or reports.read (finance sees costs); stock movements = fleet.write;
 * purchases = fleet.write or invoices.write; marking a supplier invoice paid = payments.record or invoices.write.
 */

export const STOCK_CATEGORIES = ["SPARE_PART", "LUBRICANT", "TYRE", "CLEANING", "PPE", "CONSUMABLE", "OTHER"] as const satisfies readonly StockCategory[];
export const STOCK_UNITS = ["UNIT", "LITRE", "KG", "PAIR", "BOX", "ROLL", "METRE"] as const satisfies readonly StockUnit[];

function canRead(ctx: OrgContext) {
  if (!hasPermission(ctx, "fleet.read") && !hasPermission(ctx, "reports.read")) throw new ForbiddenError("fleet.read");
}
function canMove(ctx: OrgContext) {
  if (!hasPermission(ctx, "fleet.write")) throw new ForbiddenError("fleet.write");
}
function canBuy(ctx: OrgContext) {
  if (!hasPermission(ctx, "fleet.write") && !hasPermission(ctx, "invoices.write")) throw new ForbiddenError("fleet.write");
}

/** "12.5" → 12500 (exact, from the validated string; no floating point). */
function milli(s: string): number {
  const neg = s.startsWith("-");
  const [i, f = ""] = s.replace("-", "").split(".");
  const v = Number(i) * 1000 + Number((f + "000").slice(0, 3));
  return neg ? -v : v;
}
const qtyString = (m: number) => (m / 1000).toFixed(3);
const signedQuantity = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().replace(",", "."))
  .pipe(z.string().regex(/^-?\d{1,9}(\.\d{1,3})?$/))
  .refine((v) => Number(v) !== 0);

async function lockItems(tx: Tx, itemIds: string[]) {
  // Sorted, so two purchases touching the same items always lock in the same order (no deadlock).
  for (const id of [...new Set(itemIds)].sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stock:${id}`}))`;
}

async function itemOf(db: Db, ctx: OrgContext, itemId: string) {
  const item = await db.stockItem.findFirst({ where: { id: itemId, organizationId: ctx.org.id } });
  if (!item) throw new NotFoundError("StockItem");
  return item;
}

async function balanceOf(db: Db, ctx: OrgContext, itemId: string): Promise<Balance> {
  const a = await db.stockMovement.aggregate({ where: { organizationId: ctx.org.id, itemId }, _sum: { quantity: true, valueMinor: true } });
  return { qtyMilli: Math.round(Number(a._sum.quantity ?? 0) * 1000), valueMinor: Number(a._sum.valueMinor ?? 0) };
}

async function balances(db: Db, ctx: OrgContext, itemIds?: string[]) {
  const rows = await db.stockMovement.groupBy({
    by: ["itemId"],
    where: { organizationId: ctx.org.id, ...(itemIds ? { itemId: { in: itemIds } } : {}) },
    _sum: { quantity: true, valueMinor: true },
  });
  return new Map(rows.map((r) => [r.itemId, { qtyMilli: Math.round(Number(r._sum.quantity ?? 0) * 1000), valueMinor: Number(r._sum.valueMinor ?? 0) }]));
}

// ── Items ──

const itemSchema = z.object({
  code: requiredText(40).transform((v) => v.toUpperCase()),
  name: requiredText(160),
  category: z.enum(STOCK_CATEGORIES),
  unit: z.enum(STOCK_UNITS),
  reorderLevel: z.preprocess((v) => (v === "" || v == null ? "0" : v), z.union([z.string(), z.number()]).transform((v) => String(v).trim().replace(",", ".")).pipe(z.string().regex(/^\d{1,9}(\.\d{1,3})?$/))),
  notes: optionalText(1000),
});

export async function createItem(ctx: OrgContext, input: unknown) {
  canMove(ctx);
  const data = parse(itemSchema, input);
  return prisma.$transaction(async (tx) => {
    if (await tx.stockItem.findFirst({ where: { organizationId: ctx.org.id, code: data.code }, select: { id: true } })) throw new DomainError("errors.stock.codeTaken", { fields: { code: "taken" } });
    const item = await tx.stockItem.create({ data: { organizationId: ctx.org.id, code: data.code, name: data.name, category: data.category, unit: data.unit, reorderLevel: qtyString(milli(data.reorderLevel)), notes: data.notes ?? null } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.item_created", entityType: "StockItem", entityId: item.id, data: { code: item.code } });
    return item;
  });
}

export async function updateItem(ctx: OrgContext, itemId: string, input: unknown) {
  canMove(ctx);
  const data = parse(z.object({ name: requiredText(160), reorderLevel: itemSchema.shape.reorderLevel, notes: optionalText(1000), active: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()) }), input);
  return prisma.$transaction(async (tx) => {
    const item = await itemOf(tx, ctx, itemId);
    const updated = await tx.stockItem.update({ where: { id: item.id }, data: { name: data.name, reorderLevel: qtyString(milli(data.reorderLevel)), notes: data.notes ?? null, active: data.active } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.item_updated", entityType: "StockItem", entityId: item.id, data: { reorderLevel: data.reorderLevel, active: data.active } });
    return updated;
  });
}

export type StockRow = Awaited<ReturnType<typeof listItems>>[number];

/** Items with quantity, value, average cost and the reorder flag. */
export async function listItems(ctx: OrgContext, opts: { category?: string; q?: string; low?: boolean; includeInactive?: boolean } = {}) {
  canRead(ctx);
  const category = (STOCK_CATEGORIES as readonly string[]).includes(opts.category ?? "") ? (opts.category as StockCategory) : undefined;
  const q = opts.q?.trim().slice(0, 80);
  const items = await prisma.stockItem.findMany({
    where: {
      organizationId: ctx.org.id,
      ...(opts.includeInactive ? {} : { active: true }),
      ...(category ? { category } : {}),
      ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 1000,
  });
  const bal = await balances(prisma, ctx, items.map((i) => i.id));
  const rows = items.map((i) => {
    const b = bal.get(i.id) ?? { qtyMilli: 0, valueMinor: 0 };
    const reorderMilli = Math.round(Number(i.reorderLevel) * 1000);
    return { ...i, qtyMilli: b.qtyMilli, valueMinor: b.valueMinor, avgCostMinor: averageCost(b), reorderMilli, low: isLow(b.qtyMilli, reorderMilli) };
  });
  return opts.low ? rows.filter((r) => r.low) : rows;
}

export async function stockSummary(ctx: OrgContext) {
  const rows = await listItems(ctx);
  return { items: rows.length, valueMinor: rows.reduce((s, r) => s + r.valueMinor, 0), low: rows.filter((r) => r.low) };
}

export async function getItem(ctx: OrgContext, itemId: string) {
  canRead(ctx);
  const item = await itemOf(prisma, ctx, itemId);
  const [b, movements] = await Promise.all([
    balanceOf(prisma, ctx, item.id),
    prisma.stockMovement.findMany({
      where: { organizationId: ctx.org.id, itemId: item.id },
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
      take: 300,
      include: { vehicle: { select: { id: true, plateNumber: true } }, purchase: { select: { id: true, number: true } } },
    }),
  ]);
  const reorderMilli = Math.round(Number(item.reorderLevel) * 1000);
  return { ...item, qtyMilli: b.qtyMilli, valueMinor: b.valueMinor, avgCostMinor: averageCost(b), reorderMilli, low: isLow(b.qtyMilli, reorderMilli), movements };
}

// ── Movements ──

const dayField = z.preprocess((v) => (v === "" || v == null ? undefined : v), isoDate.optional());

async function vehicleOf(tx: Tx, ctx: OrgContext, vehicleId: string | undefined) {
  if (!vehicleId) return null;
  const v = await tx.vehicle.findFirst({ where: { id: vehicleId, organizationId: ctx.org.id }, select: { id: true } });
  if (!v) throw new NotFoundError("Vehicle");
  return v.id;
}

function notFuture(ctx: OrgContext, day: string | undefined) {
  const today = orgToday(ctx);
  const d = day ?? today;
  if (d > today) throw new DomainError("errors.stock.futureDate", { fields: { occurredOn: "invalid" } });
  return dateOnly(d);
}

/** Supplies taken out of the store, optionally for a vehicle (consumption per truck). */
export async function issueStock(ctx: OrgContext, input: unknown) {
  canMove(ctx);
  const data = parse(z.object({ itemId: z.string().min(1).max(64), quantity, vehicleId: optionalText(64), reason: optionalText(300), occurredOn: dayField }), input);
  const q = milli(data.quantity);
  return prisma.$transaction(async (tx) => {
    const item = await itemOf(tx, ctx, data.itemId);
    const vehicleId = await vehicleOf(tx, ctx, data.vehicleId);
    await lockItems(tx, [item.id]);
    const b = await balanceOf(tx, ctx, item.id);
    if (q > b.qtyMilli) throw new DomainError("errors.stock.insufficient", { fields: { quantity: "insufficient" }, available: b.qtyMilli / 1000 });
    const value = outgoingValue(b, q);
    const m = await tx.stockMovement.create({
      data: { organizationId: ctx.org.id, itemId: item.id, kind: "ISSUE", quantity: qtyString(-q), valueMinor: BigInt(-value), vehicleId, reason: data.reason ?? null, occurredOn: notFuture(ctx, data.occurredOn), createdById: ctx.userId },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.issued", entityType: "StockItem", entityId: item.id, data: { quantity: q / 1000, valueMinor: value, vehicleId } });
    return m;
  });
}

/** Opening balance (first inventory), only on an item with no movement yet. */
export async function openingStock(ctx: OrgContext, input: unknown) {
  canMove(ctx);
  const data = parse(z.object({ itemId: z.string().min(1).max(64), quantity, unitCost: money, occurredOn: dayField }), input);
  const q = milli(data.quantity);
  return prisma.$transaction(async (tx) => {
    const item = await itemOf(tx, ctx, data.itemId);
    await lockItems(tx, [item.id]);
    if (await tx.stockMovement.count({ where: { organizationId: ctx.org.id, itemId: item.id } })) throw new DomainError("errors.stock.openingExists");
    const unit = toMinor(data.unitCost);
    const value = receiptValue(q, unit);
    const m = await tx.stockMovement.create({
      data: { organizationId: ctx.org.id, itemId: item.id, kind: "OPENING", quantity: qtyString(q), valueMinor: BigInt(value), unitCostMinor: BigInt(unit), occurredOn: notFuture(ctx, data.occurredOn), createdById: ctx.userId },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.opening", entityType: "StockItem", entityId: item.id, data: { quantity: q / 1000, valueMinor: value } });
    return m;
  });
}

/**
 * Inventory correction (count differs from the books). Out: at the average cost. In: at the average cost, or at the
 * unit cost given (required when the item is empty, since there is no average then). A reason is always required.
 */
export async function adjustStock(ctx: OrgContext, input: unknown) {
  canMove(ctx);
  const data = parse(z.object({ itemId: z.string().min(1).max(64), quantity: signedQuantity, reason: requiredText(300), unitCost: z.preprocess((v) => (v === "" ? undefined : v), money.optional()), occurredOn: dayField }), input);
  const q = milli(data.quantity);
  return prisma.$transaction(async (tx) => {
    const item = await itemOf(tx, ctx, data.itemId);
    await lockItems(tx, [item.id]);
    const b = await balanceOf(tx, ctx, item.id);
    let value: number;
    if (q < 0) {
      if (-q > b.qtyMilli) throw new DomainError("errors.stock.insufficient", { fields: { quantity: "insufficient" }, available: b.qtyMilli / 1000 });
      value = -outgoingValue(b, -q);
    } else if (data.unitCost) {
      value = receiptValue(q, toMinor(data.unitCost));
    } else {
      const avg = averageCost(b);
      if (avg == null) throw new DomainError("errors.stock.unitCostRequired", { fields: { unitCost: "required" } });
      value = Math.round((avg * q) / 1000);
    }
    const m = await tx.stockMovement.create({
      data: { organizationId: ctx.org.id, itemId: item.id, kind: "ADJUSTMENT", quantity: qtyString(q), valueMinor: BigInt(value), unitCostMinor: q > 0 && data.unitCost ? BigInt(toMinor(data.unitCost)) : null, reason: data.reason, occurredOn: notFuture(ctx, data.occurredOn), createdById: ctx.userId },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.adjusted", entityType: "StockItem", entityId: item.id, data: { quantity: q / 1000, valueMinor: value, reason: data.reason } });
    return m;
  });
}

// ── Suppliers & purchases ──

export async function createSupplier(ctx: OrgContext, input: unknown) {
  canBuy(ctx);
  const data = parse(z.object({ name: requiredText(160), phone: optionalText(30), email: optionalText(254), taxId: optionalText(40), address: optionalText(300) }), input);
  return prisma.$transaction(async (tx) => {
    const s = await tx.stockSupplier.create({ data: { organizationId: ctx.org.id, name: data.name, phone: data.phone ?? null, email: data.email ?? null, taxId: data.taxId ?? null, address: data.address ?? null } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.supplier_created", entityType: "StockSupplier", entityId: s.id });
    return s;
  });
}

export async function listSuppliers(ctx: OrgContext) {
  canRead(ctx);
  return prisma.stockSupplier.findMany({ where: { organizationId: ctx.org.id }, orderBy: { name: "asc" } });
}

const lineSchema = z.object({ itemId: optionalText(64), quantity: z.preprocess((v) => (v === "" ? undefined : v), quantity.optional()), unitCost: z.preprocess((v) => (v === "" ? undefined : v), money.optional()) });

/** Goods received against a supplier invoice: one RECEIPT movement per line, valued at the unit cost excluding VAT. */
export async function createPurchase(ctx: OrgContext, input: unknown) {
  canBuy(ctx);
  const data = parse(z.object({
    supplierId: z.string().min(1).max(64),
    supplierInvoiceRef: optionalText(60),
    receivedOn: dayField,
    vat: z.preprocess((v) => (v === "" || v == null ? "0" : v), money),
    paid: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
    lines: z.array(lineSchema).max(20),
  }), input);
  const lines = data.lines.filter((l) => l.itemId || l.quantity || l.unitCost);
  const fields: Record<string, string> = {};
  lines.forEach((l, i) => {
    if (!l.itemId) fields[`lines.${i}.itemId`] = "required";
    if (!l.quantity) fields[`lines.${i}.quantity`] = "required";
    if (!l.unitCost) fields[`lines.${i}.unitCost`] = "required";
  });
  if (!lines.length) fields["lines.0.itemId"] = "required";
  if (Object.keys(fields).length) throw new DomainError("errors.validation", { fields });
  const day = notFuture(ctx, data.receivedOn);
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.stockSupplier.findFirst({ where: { id: data.supplierId, organizationId: ctx.org.id, active: true } });
    if (!supplier) throw new NotFoundError("StockSupplier");
    const ids = lines.map((l) => l.itemId!);
    const items = await tx.stockItem.findMany({ where: { organizationId: ctx.org.id, id: { in: ids } }, select: { id: true } });
    if (items.length !== new Set(ids).size) throw new NotFoundError("StockItem");
    await lockItems(tx, ids);
    const priced = lines.map((l) => {
      const q = milli(l.quantity!);
      const unit = toMinor(l.unitCost!);
      return { itemId: l.itemId!, q, unit, value: receiptValue(q, unit) };
    });
    const total = priced.reduce((s, l) => s + l.value, 0);
    const purchase = await tx.stockPurchase.create({
      data: {
        organizationId: ctx.org.id, number: await nextNumber(tx, ctx.org.id, "stock-purchase", "BR"), supplierId: supplier.id,
        supplierInvoiceRef: data.supplierInvoiceRef ?? null, receivedOn: day, totalMinor: BigInt(total), vatMinor: BigInt(toMinor(data.vat)),
        paidAt: data.paid ? new Date() : null, createdById: ctx.userId,
      },
    });
    await tx.stockMovement.createMany({
      data: priced.map((l) => ({ organizationId: ctx.org.id, itemId: l.itemId, kind: "RECEIPT" as StockMovementKind, quantity: qtyString(l.q), valueMinor: BigInt(l.value), unitCostMinor: BigInt(l.unit), purchaseId: purchase.id, occurredOn: day, createdById: ctx.userId })),
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.purchase_received", entityType: "StockPurchase", entityId: purchase.id, data: { number: purchase.number, totalMinor: total, lines: priced.length } });
    return purchase;
  });
}

export async function listPurchases(ctx: OrgContext, opts: { unpaid?: boolean } = {}) {
  canRead(ctx);
  return prisma.stockPurchase.findMany({
    where: { organizationId: ctx.org.id, ...(opts.unpaid ? { paidAt: null, voidedAt: null } : {}) },
    orderBy: [{ receivedOn: "desc" }, { createdAt: "desc" }],
    take: 300,
    include: { supplier: { select: { name: true } }, _count: { select: { movements: true } } },
  });
}

export async function getPurchase(ctx: OrgContext, purchaseId: string) {
  canRead(ctx);
  const p = await prisma.stockPurchase.findFirst({
    where: { id: purchaseId, organizationId: ctx.org.id },
    include: { supplier: true, movements: { orderBy: { createdAt: "asc" }, include: { item: { select: { id: true, code: true, name: true, unit: true } } } } },
  });
  if (!p) throw new NotFoundError("StockPurchase");
  return p;
}

export async function markPurchasePaid(ctx: OrgContext, purchaseId: string) {
  if (!hasPermission(ctx, "payments.record") && !hasPermission(ctx, "invoices.write")) throw new ForbiddenError("payments.record");
  return prisma.$transaction(async (tx) => {
    const r = await tx.stockPurchase.updateMany({ where: { id: purchaseId, organizationId: ctx.org.id, paidAt: null, voidedAt: null }, data: { paidAt: new Date() } });
    if (!r.count) {
      if (!(await tx.stockPurchase.findFirst({ where: { id: purchaseId, organizationId: ctx.org.id }, select: { id: true } }))) throw new NotFoundError("StockPurchase");
      throw new DomainError("errors.invalidTransition");
    }
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.purchase_paid", entityType: "StockPurchase", entityId: purchaseId });
  });
}

/**
 * Cancels a receipt entered by mistake: reverses each line with a RECEIPT_VOID movement. Refused when part of the goods
 * has already been used (the stock is lower than the line) — then the count is corrected with an adjustment instead.
 */
export async function voidPurchase(ctx: OrgContext, purchaseId: string, input: unknown) {
  canBuy(ctx);
  const data = parse(z.object({ reason: requiredText(300) }), input);
  return prisma.$transaction(async (tx) => {
    const p = await tx.stockPurchase.findFirst({ where: { id: purchaseId, organizationId: ctx.org.id }, include: { movements: { where: { kind: "RECEIPT" } } } });
    if (!p) throw new NotFoundError("StockPurchase");
    if (p.voidedAt) throw new DomainError("errors.invalidTransition");
    await lockItems(tx, p.movements.map((m) => m.itemId));
    const reversals = [];
    const taken = new Map<string, Balance>();
    for (const m of p.movements) {
      const b = taken.get(m.itemId) ?? (await balanceOf(tx, ctx, m.itemId));
      const q = Math.round(Number(m.quantity) * 1000);
      if (q > b.qtyMilli) throw new DomainError("errors.stock.alreadyUsed");
      // Take back what the line added, but never more value than is on hand (the average may have moved since).
      const value = q === b.qtyMilli ? b.valueMinor : Math.min(Number(m.valueMinor), b.valueMinor);
      taken.set(m.itemId, { qtyMilli: b.qtyMilli - q, valueMinor: b.valueMinor - value });
      reversals.push({ organizationId: ctx.org.id, itemId: m.itemId, kind: "RECEIPT_VOID" as StockMovementKind, quantity: qtyString(-q), valueMinor: BigInt(-value), purchaseId: p.id, reason: data.reason, occurredOn: dateOnly(orgToday(ctx)), createdById: ctx.userId });
    }
    await tx.stockMovement.createMany({ data: reversals });
    await tx.stockPurchase.update({ where: { id: p.id }, data: { voidedAt: new Date(), voidReason: data.reason } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "stock.purchase_voided", entityType: "StockPurchase", entityId: p.id, data: { reason: data.reason } });
  });
}

// ── Reports ──

/** Consumption (issues) of one vehicle over a period, with its cost. */
export async function vehicleConsumption(ctx: OrgContext, vehicleId: string, from: string, to: string) {
  canRead(ctx);
  const rows = await prisma.stockMovement.findMany({
    where: { organizationId: ctx.org.id, vehicleId, kind: "ISSUE", occurredOn: { gte: dateOnly(from), lte: dateOnly(to) } },
    orderBy: { occurredOn: "desc" },
    take: 200,
    include: { item: { select: { id: true, code: true, name: true, unit: true } } },
  });
  return { rows, totalMinor: rows.reduce((s, r) => s - Number(r.valueMinor), 0) };
}

/** Period report: consumption by vehicle and by category, top items, purchases by supplier, amounts still to pay. */
export async function stockReport(ctx: OrgContext, input: { from: string; to: string }) {
  canRead(ctx);
  const { from, to } = parse(z.object({ from: isoDate, to: isoDate }), input);
  if (from > to) throw new DomainError("errors.validation", { fields: { to: "invalid" } });
  const range = { gte: dateOnly(from), lte: dateOnly(to) };
  const [issues, purchases, unpaid, summary, vehicles] = await Promise.all([
    prisma.stockMovement.findMany({ where: { organizationId: ctx.org.id, kind: "ISSUE", occurredOn: range }, select: { quantity: true, valueMinor: true, vehicleId: true, item: { select: { id: true, code: true, name: true, unit: true, category: true } } } }),
    prisma.stockPurchase.findMany({ where: { organizationId: ctx.org.id, voidedAt: null, receivedOn: range }, select: { totalMinor: true, vatMinor: true, supplier: { select: { id: true, name: true } } } }),
    prisma.stockPurchase.aggregate({ where: { organizationId: ctx.org.id, voidedAt: null, paidAt: null }, _sum: { totalMinor: true, vatMinor: true }, _count: true }),
    stockSummary(ctx),
    prisma.vehicle.findMany({ where: { organizationId: ctx.org.id }, select: { id: true, plateNumber: true, label: true } }),
  ]);
  const add = <K>(m: Map<K, number>, k: K, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const byVehicle = new Map<string | null, number>(), byCategory = new Map<StockCategory, number>();
  const byItem = new Map<string, { item: (typeof issues)[number]["item"]; qtyMilli: number; valueMinor: number }>();
  for (const r of issues) {
    const v = -Number(r.valueMinor);
    add(byVehicle, r.vehicleId, v);
    add(byCategory, r.item.category, v);
    const cur = byItem.get(r.item.id) ?? { item: r.item, qtyMilli: 0, valueMinor: 0 };
    cur.qtyMilli += -Math.round(Number(r.quantity) * 1000);
    cur.valueMinor += v;
    byItem.set(r.item.id, cur);
  }
  const bySupplier = new Map<string, { name: string; count: number; totalMinor: number; vatMinor: number }>();
  for (const p of purchases) {
    const cur = bySupplier.get(p.supplier.id) ?? { name: p.supplier.name, count: 0, totalMinor: 0, vatMinor: 0 };
    cur.count++; cur.totalMinor += Number(p.totalMinor); cur.vatMinor += Number(p.vatMinor);
    bySupplier.set(p.supplier.id, cur);
  }
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));
  return {
    from, to,
    consumedMinor: issues.reduce((s, r) => s - Number(r.valueMinor), 0),
    purchasedMinor: purchases.reduce((s, p) => s + Number(p.totalMinor), 0),
    stockValueMinor: summary.valueMinor,
    lowCount: summary.low.length,
    unpaid: { count: unpaid._count, totalMinor: Number(unpaid._sum.totalMinor ?? 0), vatMinor: Number(unpaid._sum.vatMinor ?? 0) },
    byVehicle: [...byVehicle].map(([id, valueMinor]) => ({ vehicle: id ? vehicleById.get(id) ?? null : null, valueMinor })).sort((a, b) => b.valueMinor - a.valueMinor),
    byCategory: [...byCategory].map(([category, valueMinor]) => ({ category, valueMinor })).sort((a, b) => b.valueMinor - a.valueMinor),
    topItems: [...byItem.values()].sort((a, b) => b.valueMinor - a.valueMinor).slice(0, 15),
    bySupplier: [...bySupplier.values()].sort((a, b) => b.totalMinor - a.totalMinor),
  };
}

/** Ledger rows for the export (one period, every movement). */
export async function stockLedger(ctx: OrgContext, from: string, to: string) {
  canRead(ctx);
  return prisma.stockMovement.findMany({
    where: { organizationId: ctx.org.id, occurredOn: { gte: dateOnly(from), lte: dateOnly(to) } },
    orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
    take: 100_000,
    include: { item: { select: { code: true, name: true, unit: true, category: true } }, vehicle: { select: { plateNumber: true } }, purchase: { select: { number: true, supplierInvoiceRef: true } } },
  });
}
