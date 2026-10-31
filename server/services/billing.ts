import { z } from "zod";
import { prisma } from "../db";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { hasPermission, type OrgContext } from "../context";
import { dateOnly, isoDate, optionalText, parse, requiredText } from "../validation";
import { requirePlatform } from "./platform";
import { chargilyCheckout, eventSchema, platformChargily, verifyChargilySignature } from "../payments/chargily";
import { fromMinor, toMinor } from "@/lib/money";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { BillingCycle } from "@/lib/generated/prisma/enums";

/**
 * NEXVO subscription billing (NEXVO → organizations). Collection companies only; municipalities are pilots (D-02).
 *
 * The daily run (`npm run billing:run`, or "Run now" in the console) is idempotent:
 *  1. every subscription whose period has ended gets one invoice per elapsed period (unique per organization+period);
 *     an ended trial becomes ACTIVE and is invoiced;
 *  2. an unpaid invoice past its due date makes the subscription PAST_DUE;
 *  3. only if the owner turned on auto-suspension: unpaid beyond due date + grace days → organization suspended (data kept);
 *  4. once nothing is overdue, PAST_DUE returns to ACTIVE and a billing suspension is lifted automatically.
 * Nothing is issued until the owner enables billing and fills in NEXVO's legal details.
 * Invoice numbers are gapless (row-locked counter in the same transaction as the invoice).
 */
type Tx = Prisma.TransactionClient;
const TZ = "Africa/Algiers";

export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
function addCycle(d: Date, cycle: BillingCycle) {
  const months = cycle === "YEARLY" ? 12 : 1;
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  // Keep the day of month, clamped to the target month's length (31 Jan → 28/29 Feb).
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(d.getUTCDate(), last));
  return r;
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);

export async function billingSettings(db: Tx | typeof prisma = prisma) {
  return db.platformBillingSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
}

function configured(s: Awaited<ReturnType<typeof billingSettings>>) {
  return s.enabled && !!s.issuerName && !!s.issuerTaxId;
}

const settingsSchema = z.object({
  enabled: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  autoSuspend: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  issuerName: requiredText(160),
  issuerAddress: optionalText(300),
  issuerTaxId: requiredText(40),
  issuerTradeRegister: optionalText(40),
  issuerStatId: optionalText(40),
  taxRateBps: z.coerce.number().int().min(0).max(10000),
  dueDays: z.coerce.number().int().min(0).max(120),
  graceDays: z.coerce.number().int().min(0).max(365),
});

/** OWNER only: these settings decide when organizations are invoiced and (optionally) suspended. */
export async function updateBillingSettings(userId: string, input: unknown) {
  await requirePlatform(userId, "OWNER");
  const data = parse(settingsSchema, input);
  const before = await billingSettings();
  await prisma.$transaction(async (tx) => {
    await tx.platformBillingSettings.update({ where: { id: 1 }, data: { ...data, issuerAddress: data.issuerAddress ?? null, issuerTradeRegister: data.issuerTradeRegister ?? null, issuerStatId: data.issuerStatId ?? null } });
    await audit(tx, {
      organizationId: null, actorUserId: userId, action: "platform.billing_settings_updated", entityType: "PlatformBillingSettings", entityId: "1",
      data: { enabled: [before.enabled, data.enabled], autoSuspend: [before.autoSuspend, data.autoSuspend], taxRateBps: [before.taxRateBps, data.taxRateBps], dueDays: data.dueDays, graceDays: data.graceDays },
    });
  });
}

/** Issues one invoice. Returns null when it already exists (idempotent). */
async function issueInvoice(sub: { organizationId: string; planCode: string; billingCycle: BillingCycle }, periodStart: Date, today: Date) {
  try {
    return await prisma.$transaction(async (tx) => {
      const [s] = await tx.$queryRaw<{ id: number }[]>`SELECT "id" FROM "PlatformBillingSettings" WHERE "id" = 1 FOR UPDATE`;
      if (!s) throw new Error("billing settings missing");
      const settings = await tx.platformBillingSettings.findUniqueOrThrow({ where: { id: 1 } });
      const [plan, org] = await Promise.all([
        tx.plan.findUniqueOrThrow({ where: { code: sub.planCode } }),
        tx.organization.findUniqueOrThrow({ where: { id: sub.organizationId } }),
      ]);
      const subtotal = toMinor(sub.billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly);
      const tax = Math.round((subtotal * settings.taxRateBps) / 10_000);
      const seq = settings.lastInvoiceSeq + 1;
      await tx.platformBillingSettings.update({ where: { id: 1 }, data: { lastInvoiceSeq: seq } });
      const inv = await tx.platformInvoice.create({
        data: {
          number: `NXV-${today.getUTCFullYear()}-${String(seq).padStart(5, "0")}`,
          organizationId: org.id, planCode: plan.code, cycle: sub.billingCycle,
          periodStart, periodEnd: addCycle(periodStart, sub.billingCycle),
          subtotal: fromMinor(subtotal), taxRateBps: settings.taxRateBps, taxTotal: fromMinor(tax), total: fromMinor(subtotal + tax),
          issueDate: today, dueDate: addDays(today, settings.dueDays),
          issuer: { name: settings.issuerName, address: settings.issuerAddress, taxId: settings.issuerTaxId, tradeRegister: settings.issuerTradeRegister, statId: settings.issuerStatId },
          billTo: { name: org.legalName ?? org.name, address: org.address, taxId: org.taxId, tradeRegister: org.tradeRegister, statId: org.statisticalId },
        },
      });
      await audit(tx, { organizationId: org.id, actorType: "SYSTEM", action: "platform.invoice_issued", entityType: "PlatformInvoice", entityId: inv.id, data: { number: inv.number, total: inv.total.toString() } });
      return inv;
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") return null; // already issued for this period
    throw e;
  }
}

/** Brings PAST_DUE / billing suspension back in line with what is actually overdue. */
async function reconcile(tx: Tx, organizationId: string, today: Date, s: Awaited<ReturnType<typeof billingSettings>>) {
  const [sub, org, overdue] = await Promise.all([
    tx.subscription.findUnique({ where: { organizationId } }),
    tx.organization.findUniqueOrThrow({ where: { id: organizationId } }),
    tx.platformInvoice.findMany({ where: { organizationId, status: "ISSUED", dueDate: { lt: today } }, orderBy: { dueDate: "asc" } }),
  ]);
  const out = { pastDue: false, suspended: false, reactivated: false };
  if (sub && overdue.length && sub.status === "ACTIVE") {
    await tx.subscription.update({ where: { organizationId }, data: { status: "PAST_DUE" } });
    await audit(tx, { organizationId, actorType: "SYSTEM", action: "platform.subscription_past_due", entityType: "Organization", entityId: organizationId, data: { invoice: overdue[0]!.number } });
    out.pastDue = true;
  }
  if (sub && !overdue.length && sub.status === "PAST_DUE") {
    await tx.subscription.update({ where: { organizationId }, data: { status: "ACTIVE" } });
    await audit(tx, { organizationId, actorType: "SYSTEM", action: "platform.subscription_recovered", entityType: "Organization", entityId: organizationId });
  }
  const beyondGrace = overdue.filter((i) => addDays(i.dueDate, s.graceDays) < today);
  if (s.autoSuspend && beyondGrace.length && !org.suspendedAt) {
    const reason = `Unpaid NEXVO invoice ${beyondGrace[0]!.number}`;
    await tx.organization.update({ where: { id: organizationId }, data: { suspendedAt: new Date(), suspendedReason: reason, suspendedByBilling: true } });
    await audit(tx, { organizationId, actorType: "SYSTEM", action: "platform.tenant_suspended", entityType: "Organization", entityId: organizationId, data: { reason, automatic: true } });
    out.suspended = true;
  }
  if (org.suspendedByBilling && org.suspendedAt && !beyondGrace.length) {
    await tx.organization.update({ where: { id: organizationId }, data: { suspendedAt: null, suspendedReason: null, suspendedByBilling: false } });
    await audit(tx, { organizationId, actorType: "SYSTEM", action: "platform.tenant_reactivated", entityType: "Organization", entityId: organizationId, data: { automatic: true } });
    out.reactivated = true;
  }
  return out;
}

export type BillingRunResult = { skipped?: "not_configured"; issued: number; pastDue: number; suspended: number; reactivated: number };

export async function runBilling(opts: { today?: string } = {}): Promise<BillingRunResult> {
  const s = await billingSettings();
  const result: BillingRunResult = { issued: 0, pastDue: 0, suspended: 0, reactivated: 0 };
  if (!configured(s)) return { ...result, skipped: "not_configured" };
  const today = dateOnly(opts.today ?? todayIso());
  const due = await prisma.subscription.findMany({
    where: { status: { in: ["TRIAL", "ACTIVE", "PAST_DUE"] }, currentPeriodEnd: { lte: today }, organization: { kind: "SERVICE_PROVIDER", suspendedAt: null } },
  });
  for (const sub of due) {
    let end = new Date(Date.UTC(sub.currentPeriodEnd.getUTCFullYear(), sub.currentPeriodEnd.getUTCMonth(), sub.currentPeriodEnd.getUTCDate()));
    // Catch up at most 12 periods if the job did not run for a while.
    for (let i = 0; i < 12 && end <= today; i++) {
      if (await issueInvoice(sub, end, today)) result.issued++;
      end = addCycle(end, sub.billingCycle);
    }
    await prisma.subscription.update({ where: { id: sub.id }, data: { currentPeriodEnd: end, ...(sub.status === "TRIAL" ? { status: "ACTIVE" } : {}) } });
    if (sub.status === "TRIAL") await audit(prisma, { organizationId: sub.organizationId, actorType: "SYSTEM", action: "platform.trial_converted", entityType: "Organization", entityId: sub.organizationId });
  }
  const orgs = await prisma.platformInvoice.findMany({ where: { status: "ISSUED" }, distinct: ["organizationId"], select: { organizationId: true } });
  const suspendedByBilling = await prisma.organization.findMany({ where: { suspendedByBilling: true }, select: { id: true } });
  const pastDueSubs = await prisma.subscription.findMany({ where: { status: "PAST_DUE" }, select: { organizationId: true } });
  for (const id of new Set([...orgs.map((o) => o.organizationId), ...suspendedByBilling.map((o) => o.id), ...pastDueSubs.map((p) => p.organizationId)])) {
    const r = await prisma.$transaction((tx) => reconcile(tx, id, today, s));
    result.pastDue += Number(r.pastDue);
    result.suspended += Number(r.suspended);
    result.reactivated += Number(r.reactivated);
  }
  return result;
}

export async function runBillingAsStaff(userId: string) {
  await requirePlatform(userId, "ADMIN");
  const r = await runBilling();
  await audit(prisma, { organizationId: null, actorUserId: userId, action: "platform.billing_run", entityType: "PlatformBillingSettings", entityId: "1", data: r });
  return r;
}

// ── Staff: invoices ──

export const PLATFORM_INVOICE_FILTERS = ["ISSUED", "OVERDUE", "PAID", "VOID"] as const;

export async function listPlatformInvoices(userId: string, filter?: string | null, organizationId?: string) {
  await requirePlatform(userId, "ADMIN");
  const today = dateOnly(todayIso());
  const where: Prisma.PlatformInvoiceWhereInput = {
    ...(organizationId ? { organizationId } : {}),
    ...(filter === "OVERDUE" ? { status: "ISSUED", dueDate: { lt: today } } : filter === "ISSUED" || filter === "PAID" || filter === "VOID" ? { status: filter } : {}),
  };
  const [rows, sums] = await Promise.all([
    prisma.platformInvoice.findMany({ where, orderBy: { number: "desc" }, take: 200, include: { organization: { select: { id: true, name: true } } } }),
    prisma.platformInvoice.groupBy({ by: ["status"], _sum: { total: true }, _count: true }),
  ]);
  return { rows, sums, today };
}

const paymentSchema = z.object({ method: z.enum(["BANK_TRANSFER", "CASH", "CHEQUE", "CARD_ONLINE"]), reference: optionalText(120), paidAt: isoDate });

export async function recordPlatformPayment(userId: string, invoiceId: string, input: unknown) {
  await requirePlatform(userId, "ADMIN");
  const data = parse(paymentSchema, input);
  const s = await billingSettings();
  await prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "PlatformInvoice" WHERE "id" = ${invoiceId} FOR UPDATE`;
    if (!row) throw new NotFoundError("PlatformInvoice");
    const inv = await tx.platformInvoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (inv.status !== "ISSUED") throw new DomainError("errors.payment.invoiceNotOpen");
    await tx.platformInvoice.update({ where: { id: inv.id }, data: { status: "PAID", paidAt: dateOnly(data.paidAt), paymentMethod: data.method, paymentReference: data.reference ?? null } });
    await audit(tx, { organizationId: inv.organizationId, actorUserId: userId, action: "platform.invoice_paid", entityType: "PlatformInvoice", entityId: inv.id, data: { number: inv.number, method: data.method } });
    await reconcile(tx, inv.organizationId, dateOnly(todayIso()), s);
  });
}

export async function voidPlatformInvoice(userId: string, invoiceId: string, input: unknown) {
  await requirePlatform(userId, "ADMIN");
  const { reason } = parse(z.object({ reason: requiredText(300) }), input);
  const s = await billingSettings();
  await prisma.$transaction(async (tx) => {
    const inv = await tx.platformInvoice.findUnique({ where: { id: invoiceId } });
    if (!inv) throw new NotFoundError("PlatformInvoice");
    if (inv.status !== "ISSUED") throw new DomainError("errors.payment.invoiceNotOpen");
    await tx.platformInvoice.update({ where: { id: inv.id }, data: { status: "VOID", voidReason: reason } });
    await audit(tx, { organizationId: inv.organizationId, actorUserId: userId, action: "platform.invoice_voided", entityType: "PlatformInvoice", entityId: inv.id, data: { number: inv.number, reason } });
    await reconcile(tx, inv.organizationId, dateOnly(todayIso()), s);
  });
}

// ── Organization side ──

function assertBillingReader(ctx: OrgContext) {
  if (!hasPermission(ctx, "settings.manage") || ctx.support) throw new ForbiddenError("settings.manage");
}

export async function organizationBilling(ctx: OrgContext) {
  assertBillingReader(ctx);
  const [sub, invoices] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId: ctx.org.id }, include: { plan: true } }),
    prisma.platformInvoice.findMany({ where: { organizationId: ctx.org.id, status: { not: "VOID" } }, orderBy: { issueDate: "desc" }, take: 60 }),
  ]);
  return { sub, invoices, today: dateOnly(todayIso()), onlinePayment: !!platformChargily() };
}

export async function organizationPlatformInvoice(ctx: OrgContext, id: string) {
  assertBillingReader(ctx);
  const inv = await prisma.platformInvoice.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!inv) throw new NotFoundError("PlatformInvoice");
  return inv;
}

/** Pays a NEXVO invoice online; the money goes to NEXVO's own Chargily account. */
export async function createPlatformCheckout(ctx: OrgContext, invoiceId: string, locale: "ar" | "fr" | "en") {
  assertBillingReader(ctx);
  const account = platformChargily();
  if (!account) throw new DomainError("errors.payment.onlineDisabled");
  const inv = await prisma.platformInvoice.findFirst({ where: { id: invoiceId, organizationId: ctx.org.id } });
  if (!inv) throw new NotFoundError("PlatformInvoice");
  if (inv.status !== "ISSUED") throw new DomainError("errors.payment.invoiceNotOpen");
  const app = process.env.APP_URL ?? "";
  const back = `${app}/${locale}/app/billing/${inv.id}`;
  const body = await chargilyCheckout(account, {
    amount: toMinor(inv.total) / 100, currency: "dzd",
    success_url: `${back}?payment=returned`, failure_url: `${back}?payment=failed`,
    webhook_endpoint: `${app}/api/webhooks/chargily`, locale, description: inv.number,
    metadata: { kind: "platform", platformInvoiceId: inv.id },
  });
  await prisma.platformInvoice.update({ where: { id: inv.id }, data: { checkoutExternalId: body.id, checkoutUrl: body.checkout_url } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "platform.invoice_checkout_created", entityType: "PlatformInvoice", entityId: inv.id });
  return { url: body.checkout_url };
}

/** Webhook for NEXVO's own account: settles a platform invoice when amount and currency match. */
export async function handlePlatformChargilyWebhook(raw: string, signature: string | null) {
  const account = platformChargily();
  if (!account || !verifyChargilySignature(raw, signature, account.secret)) throw new ForbiddenError("webhook.signature");
  const evt = eventSchema.parse(JSON.parse(raw));
  const s = await billingSettings();
  return prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "PlatformInvoice" WHERE "checkoutExternalId" = ${evt.data.id} FOR UPDATE`;
    if (!row) return { outcome: "unknown_checkout" as const };
    const inv = await tx.platformInvoice.findUniqueOrThrow({ where: { id: row.id } });
    if (inv.status === "PAID") return { outcome: "duplicate" as const };
    if (evt.type !== "checkout.paid" || evt.data.status !== "paid") return { outcome: "recorded" as const };
    if (inv.status !== "ISSUED") {
      await audit(tx, { organizationId: inv.organizationId, actorType: "SYSTEM", action: "payment.reconcile_required", entityType: "PlatformInvoice", entityId: inv.id, data: { reason: inv.status } });
      return { outcome: "reconcile_required" as const };
    }
    if (toMinor(evt.data.amount.toFixed(2)) !== toMinor(inv.total) || evt.data.currency.toUpperCase() !== inv.currency) {
      await audit(tx, { organizationId: inv.organizationId, actorType: "SYSTEM", action: "payment.checkout_mismatch", entityType: "PlatformInvoice", entityId: inv.id, data: { eventAmount: evt.data.amount } });
      return { outcome: "amount_mismatch" as const };
    }
    await tx.platformInvoice.update({ where: { id: inv.id }, data: { status: "PAID", paidAt: new Date(), paymentMethod: "CARD_ONLINE", paymentReference: evt.data.id } });
    await audit(tx, { organizationId: inv.organizationId, actorType: "SYSTEM", action: "platform.invoice_paid", entityType: "PlatformInvoice", entityId: inv.id, data: { number: inv.number, method: "CARD_ONLINE" } });
    await reconcile(tx, inv.organizationId, dateOnly(todayIso()), s);
    return { outcome: "applied" as const };
  });
}

/** Subscription billing cycle is part of the platform subscription form. */
export const cycleSchema = z.enum(["MONTHLY", "YEARLY"]);
export { iso as isoDay };
