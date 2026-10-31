import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db";
import { hasPermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { applyPaymentTx } from "../services/invoices";
import { fromMinor, toMinor } from "@/lib/money";

/**
 * Chargily Pay V2 (CIB / Edahabia) adapter.
 * Facts taken from the official SDK `@chargily/chargily-pay` 2.1.0 (MIT):
 *  - API base: https://pay.chargily.net/test/api/v2 (test) | https://pay.chargily.net/api/v2 (live), Bearer secret key
 *  - POST /checkouts { amount, currency, success_url, failure_url, webhook_endpoint, locale, description, metadata }
 *  - checkout.status: pending | processing | paid | failed | canceled
 *  - webhook: header `signature` = hex(HMAC-SHA256(raw body, secret key))
 * Not yet verified against a live test account: minimum amount and decimal handling of `amount`.
 */
export const PROVIDER = "chargily";
const BASES = { test: "https://pay.chargily.net/test/api/v2", live: "https://pay.chargily.net/api/v2" } as const;

export function chargilyEnabled() {
  return !!process.env.CHARGILY_SECRET_KEY;
}
function mode(): "test" | "live" {
  return process.env.CHARGILY_MODE === "live" ? "live" : "test";
}

type Fetch = typeof fetch;
let fetchImpl: Fetch = (...a) => fetch(...a);
/** Test seam. */
export function setChargilyFetch(f: Fetch) {
  fetchImpl = f;
}

/**
 * Creates a hosted checkout for the open balance of an invoice. Customer-portal users may pay
 * only their own invoices; staff need payments.record.
 */
export async function createInvoiceCheckout(ctx: OrgContext, invoiceId: string, locale: "ar" | "fr" | "en") {
  if (!chargilyEnabled()) throw new DomainError("errors.payment.onlineDisabled");
  const portal = ctx.role === "CUSTOMER_PORTAL";
  if (!portal && !hasPermission(ctx, "payments.record")) throw new ForbiddenError("payments.record");
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: ctx.org.id, ...(portal ? { customerId: ctx.customerId ?? "__none__" } : {}) },
  });
  if (!inv) throw new NotFoundError("Invoice");
  if (inv.status !== "ISSUED" && inv.status !== "PARTIALLY_PAID") throw new DomainError("errors.payment.invoiceNotOpen");
  const balanceMinor = toMinor(inv.total) - toMinor(inv.amountPaid);
  if (balanceMinor <= 0) throw new DomainError("errors.payment.invoiceNotOpen");

  const app = process.env.APP_URL ?? "";
  // Fail closed: live payments need an absolute https callback/webhook URL.
  if (mode() === "live" && !app.startsWith("https://")) throw new DomainError("errors.payment.providerUnavailable");
  const back = `${app}/${locale}/${portal ? "portal" : `app/invoices/${inv.id}`}`;
  const res = await fetchImpl(`${BASES[mode()]}/checkouts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CHARGILY_SECRET_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      amount: balanceMinor / 100,
      currency: "dzd",
      success_url: `${back}?payment=returned`,
      failure_url: `${back}?payment=failed`,
      webhook_endpoint: `${app}/api/webhooks/chargily`,
      locale,
      description: `${inv.number ?? inv.id}`,
      metadata: { organizationId: ctx.org.id, invoiceId: inv.id },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.error("[chargily] checkout creation failed", res.status);
    throw new DomainError("errors.payment.providerUnavailable");
  }
  const body = z.object({ id: z.string().min(1), checkout_url: z.string().url(), livemode: z.boolean().optional() }).parse(await res.json());
  const checkout = await prisma.paymentCheckout.create({
    data: {
      organizationId: ctx.org.id, invoiceId: inv.id, provider: PROVIDER, externalId: body.id, amount: fromMinor(balanceMinor),
      currency: "DZD", checkoutUrl: body.checkout_url, livemode: body.livemode ?? mode() === "live", createdById: ctx.userId,
    },
  });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "payment.checkout_created", entityType: "Invoice", entityId: inv.id, data: { provider: PROVIDER, checkoutId: checkout.id, amount: checkout.amount.toString() } });
  return { url: body.checkout_url };
}

export function verifyChargilySignature(raw: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"), "utf8");
  const given = Buffer.from(signature.toLowerCase(), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const eventSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  data: z.object({ id: z.string().min(1), status: z.string(), amount: z.number(), currency: z.string() }).passthrough(),
});

/**
 * Applies a verified webhook. The invoice is marked paid only when the event amount and currency match
 * the checkout we created (never trusting metadata alone). Replays have no second effect.
 */
export async function handleChargilyWebhook(raw: string, signature: string | null) {
  if (!verifyChargilySignature(raw, signature, process.env.CHARGILY_SECRET_KEY)) throw new ForbiddenError("webhook.signature");
  const evt = eventSchema.parse(JSON.parse(raw));
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "PaymentCheckout" WHERE "provider" = ${PROVIDER} AND "externalId" = ${evt.data.id} FOR UPDATE`;
    if (!rows[0]) return { outcome: "unknown_checkout" as const };
    const c = await tx.paymentCheckout.findUniqueOrThrow({ where: { id: rows[0].id } });
    if (c.status === "PAID") return { outcome: "duplicate" as const };

    if (evt.type === "checkout.paid" && evt.data.status === "paid") {
      const amountMatches = toMinor(evt.data.amount.toFixed(2)) === toMinor(c.amount) && evt.data.currency.toUpperCase() === c.currency;
      if (!amountMatches) {
        await audit(tx, { organizationId: c.organizationId, actorType: "SYSTEM", action: "payment.checkout_mismatch", entityType: "Invoice", entityId: c.invoiceId, data: { checkoutId: c.id, eventAmount: evt.data.amount, currency: evt.data.currency } });
        return { outcome: "amount_mismatch" as const };
      }
      await tx.paymentCheckout.update({ where: { id: c.id }, data: { status: "PAID", settledAt: new Date() } });
      try {
        await applyPaymentTx(tx, c.organizationId, c.invoiceId, {
          amount: c.amount.toString(), method: "CARD_ONLINE", reference: c.externalId,
          receivedAt: new Date().toISOString().slice(0, 10), idempotencyKey: `${PROVIDER}:${c.externalId}`, source: "WEBHOOK", recordedById: null,
        });
        return { outcome: "applied" as const };
      } catch (e) {
        // Money was received but the invoice can no longer take it (e.g. paid by transfer meanwhile).
        if (e instanceof DomainError) {
          await audit(tx, { organizationId: c.organizationId, actorType: "SYSTEM", action: "payment.reconcile_required", entityType: "Invoice", entityId: c.invoiceId, data: { checkoutId: c.id, reason: e.code } });
          return { outcome: "reconcile_required" as const };
        }
        throw e;
      }
    }
    const terminal = { failed: "FAILED", canceled: "CANCELED", expired: "EXPIRED" } as const;
    const next = terminal[evt.data.status as keyof typeof terminal];
    if (next) await tx.paymentCheckout.update({ where: { id: c.id }, data: { status: next, settledAt: new Date() } });
    return { outcome: "recorded" as const };
  });
}
