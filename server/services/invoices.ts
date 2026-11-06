import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma, type Tx } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, InvalidTransitionError, NotFoundError } from "../domain/errors";
import { applyPayment, computeLine, computeTotals, reversePayment } from "../domain/invoice-math";
import { percentOf, tonnagePrice } from "../domain/pricing";
import { readTiers } from "./contracts";
import { audit } from "../audit";
import { nextSequence } from "../counters";
import { dateOnly, isoDate, money, optionalText, parse, quantity, requiredText } from "../validation";
import { fromMinor, toMinor } from "@/lib/money";
import type { InvoiceStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

function assertInvoiceRead(ctx: OrgContext) {
  if (!(hasPermission(ctx, "invoices.read") || hasPermission(ctx, "portal.access"))) throw new ForbiddenError("invoices.read");
}

function scope(ctx: OrgContext) {
  return ctx.role === "CUSTOMER_PORTAL"
    ? { organizationId: ctx.org.id, customerId: ctx.customerId ?? "__none__", status: { not: "DRAFT" as const } }
    : { organizationId: ctx.org.id };
}

export async function listInvoices(ctx: OrgContext, opts: { status?: InvoiceStatus } = {}) {
  assertInvoiceRead(ctx);
  return prisma.invoice.findMany({
    where: { ...scope(ctx), ...(opts.status ? { status: opts.status } : {}) },
    include: { customer: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });
}

export async function getInvoice(ctx: OrgContext, invoiceId: string) {
  assertInvoiceRead(ctx);
  const inv = await prisma.invoice.findFirst({
    where: { ...scope(ctx), id: invoiceId },
    include: {
      customer: true,
      contract: { select: { reference: true, title: true } },
      lines: { orderBy: { position: "asc" }, include: { workOrder: { select: { number: true, scheduledDate: true } } } },
      payments: { orderBy: { receivedAt: "asc" } },
    },
  });
  if (!inv) throw new NotFoundError("Invoice");
  return inv;
}

/** Completed, not-yet-invoiced work orders for a customer — the only valid source for billable lines. */
export async function billableWorkOrders(ctx: OrgContext, customerId: string) {
  requirePermission(ctx, "invoices.write");
  const orders = await prisma.workOrder.findMany({
    where: { organizationId: ctx.org.id, customerId, status: "COMPLETED", invoiceLine: null, kind: "COLLECTION" },
    include: PRICING_INCLUDE,
    orderBy: { scheduledDate: "asc" },
  });
  // A job without a contract price (one-off) needs its price typed in when the draft is created.
  return orders.map((wo) => ({ ...wo, needsPrice: !contractLineFor(wo) }));
}

async function recalc(tx: Tx, organizationId: string, invoiceId: string) {
  const lines = await tx.invoiceLine.findMany({ where: { organizationId, invoiceId } });
  const totals = computeTotals(
    lines.map((l) => ({ subtotal: toMinor(l.lineSubtotal), tax: toMinor(l.lineTax), total: toMinor(l.lineTotal) })),
  );
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotal: fromMinor(totals.subtotal), taxTotal: fromMinor(totals.tax), total: fromMinor(totals.total) },
  });
}

/** What a work order needs loaded to be priced. */
export const PRICING_INCLUDE = { weightTickets: true, wasteCategory: true, serviceLocation: true, contract: { include: { lines: true } } } as const;
type PricedWorkOrder = Prisma.WorkOrderGetPayload<{ include: typeof PRICING_INCLUDE }>;

/** The contract service line that prices this work order (its own line, or the one with the same location and category). */
export function contractLineFor(wo: PricedWorkOrder) {
  return (
    (wo.contractLineId ? wo.contract?.lines.find((l) => l.id === wo.contractLineId) : undefined) ??
    wo.contract?.lines.find((l) => l.serviceLocationId === wo.serviceLocationId && l.wasteCategoryId === wo.wasteCategoryId)
  );
}

function workOrderDescription(wo: PricedWorkOrder, detail = "") {
  return `${wo.number} · ${wo.wasteCategory?.nameFr ?? ""} · ${wo.serviceLocation?.label ?? ""} · ${wo.scheduledDate.toISOString().slice(0, 10)}${detail}`.slice(0, 300);
}

/**
 * Invoice line for one completed work order. The price comes from its contract service line (or the line with the same
 * location and category); PER_TONNE bills the recorded net weight; PER_MONTH is billed by the monthly run, not per job.
 * A one-off job (no contract price) is billed at `jobPrice`, typed by finance when drafting; the line stays linked to the job.
 */
export function workOrderLine(ctx: OrgContext, wo: PricedWorkOrder, jobPrice?: string) {
  const cl = contractLineFor(wo);
  if (!cl) {
    if (jobPrice === undefined) throw new DomainError("errors.invoice.noContractPrice", { number: wo.number });
    return { ...manualLineData(ctx, workOrderDescription(wo), "1", toMinor(jobPrice)), workOrderId: wo.id as string | null };
  }
  let qty = "1";
  let unitPriceMinor = toMinor(cl.unitPrice);
  let detail = "";
  if (cl.billingUnit === "PER_TONNE") {
    const netKgMinor = wo.weightTickets.reduce((s, t) => s + toMinor(t.netKg), 0);
    if (netKgMinor <= 0) throw new DomainError("errors.invoice.weightRequired", { number: wo.number });
    const tiers = readTiers(cl.tiers);
    const minimumMinor = cl.minimumCharge != null ? toMinor(cl.minimumCharge) : null;
    if (tiers.length || minimumMinor != null) {
      // Tiered or minimum price: one line for the job (quantity 1), the breakdown in the description (D-90).
      const p = tonnagePrice(netKgMinor, unitPriceMinor, tiers.map((t) => ({ aboveKg: t.aboveKg, unitPriceMinor: toMinor(t.unitPrice) })), minimumMinor);
      const t = (kgMinor: number) => (kgMinor / 100_000).toFixed(3);
      detail = ` · ${t(netKgMinor)} t : ${p.parts.map((x) => `${t(x.kgMinor)} t × ${fromMinor(x.unitPriceMinor)}`).join(" + ")}${p.minimumApplied ? ` → minimum ${fromMinor(minimumMinor!)}` : ""}`;
      unitPriceMinor = p.totalMinor;
    } else {
      qty = (netKgMinor / 100 / 1000).toFixed(3); // kg (2dp) → tonnes (3dp)
    }
  } else if (cl.billingUnit === "PER_MONTH") {
    throw new DomainError("errors.invoice.monthlyNotPerWorkOrder", { number: wo.number });
  }
  const amounts = computeLine({ quantity: qty, unitPriceMinor, taxRateBps: ctx.org.defaultTaxRateBps });
  return {
    organizationId: ctx.org.id,
    description: workOrderDescription(wo, detail),
    quantity: qty,
    unitPrice: fromMinor(unitPriceMinor),
    taxRateBps: ctx.org.defaultTaxRateBps,
    lineSubtotal: fromMinor(amounts.subtotal),
    lineTax: fromMinor(amounts.tax),
    lineTotal: fromMinor(amounts.total),
    workOrderId: wo.id as string | null,
  };
}

type Surcharge = { contractId: string; label: string; kind: "PERCENT" | "PER_COLLECTION"; value: Prisma.Decimal | string; contract: { reference: string } };
export type ContractGroup = { subtotalMinor: number; collections: number };

/** Active surcharges of these contracts (one query), for surchargeLines(). */
export async function activeSurcharges(db: Tx | typeof prisma, organizationId: string, contractIds: string[]): Promise<Surcharge[]> {
  if (!contractIds.length) return [];
  return db.contractSurcharge.findMany({ where: { organizationId, contractId: { in: contractIds }, active: true }, include: { contract: { select: { reference: true } } }, orderBy: { createdAt: "asc" } });
}

/**
 * Surcharge lines for an invoice (D-90): a PERCENT surcharge on the subtotal of that contract's lines on the invoice,
 * a PER_COLLECTION one per collection billed under it. Each is its own visible line, never folded into a price.
 */
export function surchargeLines(ctx: OrgContext, surcharges: Surcharge[], groups: Map<string, ContractGroup>) {
  const out: ReturnType<typeof manualLineData>[] = [];
  for (const sc of surcharges) {
    const g = groups.get(sc.contractId);
    if (!g) continue;
    if (sc.kind === "PERCENT") {
      const amount = percentOf(g.subtotalMinor, Math.round(Number(sc.value) * 100));
      if (amount > 0) out.push(manualLineData(ctx, `${sc.label} ${Number(sc.value)} % · ${sc.contract.reference}`, "1", amount));
    } else if (g.collections > 0) {
      out.push(manualLineData(ctx, `${sc.label} · ${sc.contract.reference}`, String(g.collections), toMinor(sc.value)));
    }
  }
  return out;
}

function manualLineData(ctx: OrgContext, description: string, qty: string, unitPriceMinor: number) {
  const amounts = computeLine({ quantity: qty, unitPriceMinor, taxRateBps: ctx.org.defaultTaxRateBps });
  return {
    organizationId: ctx.org.id,
    description: description.slice(0, 300),
    quantity: qty,
    unitPrice: fromMinor(unitPriceMinor),
    taxRateBps: ctx.org.defaultTaxRateBps,
    lineSubtotal: fromMinor(amounts.subtotal),
    lineTax: fromMinor(amounts.tax),
    lineTotal: fromMinor(amounts.total),
    workOrderId: null,
  };
}

/** Totals of an invoice from its lines (exported for the monthly run). */
export async function recalcInvoice(tx: Tx, organizationId: string, invoiceId: string) {
  return recalc(tx, organizationId, invoiceId);
}

const draftSchema = z.object({
  customerId: z.string().min(1),
  workOrderIds: z.array(z.string().min(1)).max(200).default([]),
  /** Prices (excl. tax) of selected jobs that have no contract price, by work order id. */
  prices: z.record(z.string(), money.refine((v) => Number(v) > 0)).default({}),
  notes: optionalText(2000),
});

/**
 * Creates a draft invoice from completed work orders. Prices come from the matching
 * contract service line (same location + category); PER_TONNE uses recorded net weight.
 */
export async function createDraftInvoice(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const data = parse(draftSchema, input);
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: data.customerId, organizationId: ctx.org.id } });
    if (!customer) throw new NotFoundError("Customer");
    const orders = await tx.workOrder.findMany({
      where: { id: { in: data.workOrderIds }, organizationId: ctx.org.id },
      include: { invoiceLine: true, ...PRICING_INCLUDE },
    });
    if (orders.length !== data.workOrderIds.length) throw new NotFoundError("WorkOrder");

    const lines: (ReturnType<typeof workOrderLine> & { position: number })[] = orders.map((wo, i) => {
      if (wo.customerId !== customer.id) throw new DomainError("errors.invoice.customerMismatch");
      if (wo.status !== "COMPLETED") throw new DomainError("errors.invoice.workOrderNotCompleted", { number: wo.number });
      if (wo.invoiceLine) throw new DomainError("errors.invoice.alreadyInvoiced", { number: wo.number });
      return { ...workOrderLine(ctx, wo, data.prices[wo.id]), position: i };
    });
    const groups = new Map<string, ContractGroup>();
    orders.forEach((o, i) => {
      if (!o.contractId) return;
      const g = groups.get(o.contractId) ?? { subtotalMinor: 0, collections: 0 };
      g.subtotalMinor += toMinor(lines[i]!.lineSubtotal);
      g.collections++;
      groups.set(o.contractId, g);
    });
    const extra = surchargeLines(ctx, await activeSurcharges(tx, ctx.org.id, [...groups.keys()]), groups);
    lines.push(...extra.map((l, k) => ({ ...l, position: lines.length + k })));
    const contractIds = [...new Set(orders.map((o) => o.contractId).filter(Boolean))];
    const invoice = await tx.invoice.create({
      data: {
        organizationId: ctx.org.id,
        customerId: customer.id,
        contractId: contractIds.length === 1 ? contractIds[0] : null,
        currency: ctx.org.currency,
        notes: data.notes,
        createdById: ctx.userId,
      },
    });
    if (lines.length) await tx.invoiceLine.createMany({ data: lines.map((l) => ({ ...l, invoiceId: invoice.id })) });
    await recalc(tx, ctx.org.id, invoice.id);
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "invoice.draft_created", entityType: "Invoice", entityId: invoice.id, data: { workOrders: orders.map((o) => o.number) } });
    return invoice;
  });
}

const manualLineSchema = z.object({
  description: requiredText(300),
  quantity,
  unitPrice: money,
  taxRateBps: z.coerce.number().int().min(0).max(10000),
});

async function lockDraft(tx: Tx, ctx: OrgContext, invoiceId: string) {
  const rows = await tx.$queryRaw<{ id: string; status: InvoiceStatus }[]>`
    SELECT "id", "status" FROM "Invoice" WHERE "id" = ${invoiceId} AND "organizationId" = ${ctx.org.id} FOR UPDATE`;
  const inv = rows[0];
  if (!inv) throw new NotFoundError("Invoice");
  return inv;
}

export async function addManualLine(ctx: OrgContext, invoiceId: string, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const data = parse(manualLineSchema, input);
  return prisma.$transaction(async (tx) => {
    const inv = await lockDraft(tx, ctx, invoiceId);
    if (inv.status !== "DRAFT") throw new DomainError("errors.invoice.locked");
    const unitPriceMinor = toMinor(data.unitPrice);
    const a = computeLine({ quantity: data.quantity, unitPriceMinor, taxRateBps: data.taxRateBps });
    const position = await tx.invoiceLine.count({ where: { organizationId: ctx.org.id, invoiceId } });
    await tx.invoiceLine.create({
      data: {
        organizationId: ctx.org.id,
        invoiceId,
        description: data.description,
        quantity: data.quantity,
        unitPrice: fromMinor(unitPriceMinor),
        taxRateBps: data.taxRateBps,
        lineSubtotal: fromMinor(a.subtotal),
        lineTax: fromMinor(a.tax),
        lineTotal: fromMinor(a.total),
        position,
      },
    });
    await recalc(tx, ctx.org.id, invoiceId);
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "invoice.line_added", entityType: "Invoice", entityId: invoiceId, data: { quantity: data.quantity, unitPrice: data.unitPrice, taxRateBps: data.taxRateBps } });
  });
}

export async function removeLine(ctx: OrgContext, invoiceId: string, lineId: string) {
  requirePermission(ctx, "invoices.write");
  return prisma.$transaction(async (tx) => {
    const inv = await lockDraft(tx, ctx, invoiceId);
    if (inv.status !== "DRAFT") throw new DomainError("errors.invoice.locked");
    const r = await tx.invoiceLine.deleteMany({ where: { id: lineId, invoiceId, organizationId: ctx.org.id } });
    if (r.count === 0) throw new NotFoundError("InvoiceLine");
    await recalc(tx, ctx.org.id, invoiceId);
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "invoice.line_removed", entityType: "Invoice", entityId: invoiceId, data: { lineId } });
  });
}

/** Issuing assigns the next sequential number, snapshots bill-to identity and locks the lines. */
export async function issueInvoice(ctx: OrgContext, invoiceId: string, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const data = parse(z.object({ issueDate: isoDate, dueDate: isoDate }).refine((d) => d.dueDate >= d.issueDate, { path: ["dueDate"], message: "afterIssue" }), input);
  return prisma.$transaction(async (tx) => {
    const locked = await lockDraft(tx, ctx, invoiceId);
    if (locked.status !== "DRAFT") throw new InvalidTransitionError("Invoice", locked.status, "ISSUED");
    const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { customer: true, _count: { select: { lines: true } } } });
    if (inv._count.lines === 0 || toMinor(inv.total) <= 0) throw new DomainError("errors.invoice.empty");
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.org.id } });
    const year = data.issueDate.slice(0, 4);
    const seq = await nextSequence(tx, ctx.org.id, `invoice-${year}`);
    const number = `${org.invoicePrefix}-${year}-${String(seq).padStart(5, "0")}`;
    await tx.invoice.update({
      where: { id: inv.id },
      data: {
        status: "ISSUED",
        number,
        issueDate: dateOnly(data.issueDate),
        dueDate: dateOnly(data.dueDate),
        issuedById: ctx.userId,
        billToName: inv.customer.name,
        billToTaxId: inv.customer.taxId,
        billToAddress: inv.customer.billingAddress,
      },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "invoice.issued", entityType: "Invoice", entityId: inv.id, data: { number, total: inv.total.toString() } });
    return number;
  });
}

/** Voiding is only allowed with no recorded payments; issued numbers are kept (never reused). */
export async function voidInvoice(ctx: OrgContext, invoiceId: string, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(500) }), input);
  return prisma.$transaction(async (tx) => {
    const locked = await lockDraft(tx, ctx, invoiceId);
    if (locked.status !== "ISSUED" && locked.status !== "DRAFT") throw new InvalidTransitionError("Invoice", locked.status, "VOID");
    const paid = await tx.payment.count({ where: { invoiceId, status: "RECORDED" } });
    if (paid > 0) throw new DomainError("errors.invoice.hasPayments");
    await tx.invoice.update({ where: { id: invoiceId }, data: { status: "VOID", voidReason: reason } });
    // Release work orders and monthly fees so they can be billed on a corrected invoice (periodMonth stays as history).
    await tx.invoiceLine.updateMany({ where: { invoiceId, organizationId: ctx.org.id }, data: { workOrderId: null, contractLineId: null } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "invoice.voided", entityType: "Invoice", entityId: invoiceId, data: { reason } });
  });
}

const paymentSchema = z.object({
  amount: money,
  method: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CARD_ONLINE", "OTHER"]),
  reference: optionalText(120),
  receivedAt: isoDate,
  idempotencyKey: z.string().trim().min(8).max(120),
});

type PaymentInput = z.infer<typeof paymentSchema> & { source: "MANUAL" | "WEBHOOK"; recordedById: string | null };

/** Core payment application. Row lock + unique idempotency key make retries and races safe. */
export async function applyPaymentTx(tx: Tx, organizationId: string, invoiceId: string, p: PaymentInput) {
  const existing = await tx.payment.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: p.idempotencyKey } } });
  if (existing) {
    if (existing.invoiceId !== invoiceId || toMinor(existing.amount) !== toMinor(p.amount)) throw new DomainError("errors.payment.idempotencyConflict");
    return { payment: existing, duplicate: true };
  }
  const rows = await tx.$queryRaw<{ status: InvoiceStatus; total: string; amountPaid: string }[]>`
    SELECT "status", "total"::text, "amountPaid"::text FROM "Invoice"
    WHERE "id" = ${invoiceId} AND "organizationId" = ${organizationId} FOR UPDATE`;
  const inv = rows[0];
  if (!inv) throw new NotFoundError("Invoice");
  const next = applyPayment(inv.status, toMinor(inv.total), toMinor(inv.amountPaid), toMinor(p.amount));
  const payment = await tx.payment.create({
    data: {
      organizationId,
      invoiceId,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      receivedAt: new Date(`${p.receivedAt}T12:00:00.000Z`),
      source: p.source,
      idempotencyKey: p.idempotencyKey,
      recordedById: p.recordedById,
    },
  });
  await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid: fromMinor(next.paid), status: next.status } });
  await audit(tx, { organizationId, actorType: p.source === "WEBHOOK" ? "SYSTEM" : "USER", actorUserId: p.recordedById, action: "payment.recorded", entityType: "Invoice", entityId: invoiceId, data: { paymentId: payment.id, amount: p.amount, method: p.method, status: next.status } });
  return { payment, duplicate: false };
}

export async function recordPayment(ctx: OrgContext, invoiceId: string, input: unknown) {
  requirePermission(ctx, "payments.record");
  const data = parse(paymentSchema, input);
  return prisma.$transaction((tx) => applyPaymentTx(tx, ctx.org.id, invoiceId, { ...data, source: "MANUAL", recordedById: ctx.userId }));
}

export async function reverseRecordedPayment(ctx: OrgContext, paymentId: string, input: unknown) {
  requirePermission(ctx, "payments.record");
  const { reason } = parse(z.object({ reason: requiredText(300) }), input);
  return prisma.$transaction(async (tx) => {
    const p = await tx.payment.findFirst({ where: { id: paymentId, organizationId: ctx.org.id } });
    if (!p) throw new NotFoundError("Payment");
    if (p.status === "REVERSED") throw new DomainError("errors.payment.alreadyReversed");
    const rows = await tx.$queryRaw<{ total: string; amountPaid: string }[]>`
      SELECT "total"::text, "amountPaid"::text FROM "Invoice" WHERE "id" = ${p.invoiceId} FOR UPDATE`;
    const inv = rows[0]!;
    const next = reversePayment(toMinor(inv.total), toMinor(inv.amountPaid), toMinor(p.amount));
    await tx.payment.update({ where: { id: p.id }, data: { status: "REVERSED" } });
    await tx.invoice.update({ where: { id: p.invoiceId }, data: { amountPaid: fromMinor(next.paid), status: next.status } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "payment.reversed", entityType: "Invoice", entityId: p.invoiceId, data: { paymentId: p.id, reason } });
  });
}

// ───────────── Payment provider webhooks ─────────────

const webhookSchema = z.object({
  eventId: z.string().min(1).max(200),
  type: z.literal("payment.succeeded"),
  organizationId: z.string().min(1),
  invoiceId: z.string().min(1),
  amount: money,
  reference: optionalText(120),
  paidAt: isoDate,
});

export function signWebhook(rawBody: string, secret: string) {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const expected = Buffer.from(signWebhook(rawBody, secret), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Processes a signed provider notification. An invoice becomes paid only through this verified
 * path or a staff-recorded payment — never because a browser redirect "looked" successful.
 * Replays of the same eventId are acknowledged without a second financial effect.
 */
export async function processPaymentWebhook(provider: string, rawBody: string, signature: string | null, secret: string | undefined) {
  if (!verifyWebhookSignature(rawBody, signature, secret)) throw new ForbiddenError("webhook.signature");
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new DomainError("errors.validation");
  }
  const evt = parse(webhookSchema, json);
  return prisma.$transaction(async (tx) => {
    const inserted = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "PaymentWebhookEvent" ("id", "provider", "externalEventId", "payload")
      VALUES (gen_random_uuid()::text, ${provider}, ${evt.eventId}, ${JSON.stringify(json)}::jsonb)
      ON CONFLICT ("provider", "externalEventId") DO NOTHING RETURNING "id"`;
    if (inserted.length === 0) return { duplicate: true as const };
    const result = await applyPaymentTx(tx, evt.organizationId, evt.invoiceId, {
      amount: evt.amount,
      method: "CARD_ONLINE",
      reference: evt.reference,
      receivedAt: evt.paidAt,
      idempotencyKey: `webhook:${provider}:${evt.eventId}`,
      source: "WEBHOOK",
      recordedById: null,
    });
    await tx.paymentWebhookEvent.update({ where: { provider_externalEventId: { provider, externalEventId: evt.eventId } }, data: { processedAt: new Date(), outcome: "applied" } });
    return { duplicate: result.duplicate, paymentId: result.payment.id };
  });
}
