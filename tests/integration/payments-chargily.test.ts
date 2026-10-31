import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { addMember, isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createCustomer } from "@/server/services/customers";
import { addManualLine, createDraftInvoice, getInvoice, issueInvoice, recordPayment } from "@/server/services/invoices";
import { createInvoiceCheckout, handleChargilyWebhook, setChargilyFetch, verifyChargilySignature } from "@/server/payments/chargily";
import type { OrgContext } from "@/server/context";

/** Online payment (Chargily Pay V2) — fake HTTP, real database. */
const KEY = "test_sk_synthetic_0123456789";
const sign = (raw: string) => createHmac("sha256", KEY).update(raw).digest("hex");
let ctx: OrgContext;
let other: OrgContext;
let invoiceId: string;
let customerId: string;
let n = 0;
let lastRequest: { url: string; body: Record<string, unknown>; auth: string | null } | null = null;

async function openInvoice(c: OrgContext, custId: string, price = "10000") {
  const draft = await createDraftInvoice(c, { customerId: custId, workOrderIds: [] });
  await addManualLine(c, draft.id, { description: "Location benne", quantity: "1", unitPrice: price, taxRateBps: 1900 });
  await issueInvoice(c, draft.id, { issueDate: isoDay(0), dueDate: isoDay(15) });
  return draft.id;
}
const paidEvent = (externalId: string, amount: number, currency = "dzd") =>
  JSON.stringify({ id: `evt_${externalId}`, type: "checkout.paid", data: { id: externalId, status: "paid", amount, currency } });

beforeAll(async () => {
  process.env.CHARGILY_SECRET_KEY = KEY;
  process.env.APP_URL = "http://localhost:3000";
  setChargilyFetch(async (url, init) => {
    n++;
    lastRequest = { url: String(url), body: JSON.parse(String(init?.body)), auth: new Headers(init?.headers).get("authorization") };
    return new Response(JSON.stringify({ id: `chk_${n}`, checkout_url: `https://pay.chargily.net/test/checkout/chk_${n}`, livemode: false }), { status: 200 });
  });
  await resetDb();
  ctx = (await newOrg()).ctx;
  other = (await newOrg()).ctx;
  customerId = (await createCustomer(ctx, { name: "Client A" })).id;
  invoiceId = await openInvoice(ctx, customerId);
});
afterAll(() => {
  delete process.env.CHARGILY_SECRET_KEY;
});

describe("checkout creation", () => {
  it("creates a checkout for the open balance, in test mode, with our webhook URL", async () => {
    const r = await createInvoiceCheckout(ctx, invoiceId, "ar");
    expect(r.url).toMatch(/^https:\/\/pay\.chargily\.net\/test\//);
    expect(lastRequest!.url).toBe("https://pay.chargily.net/test/api/v2/checkouts");
    expect(lastRequest!.auth).toBe(`Bearer ${KEY}`);
    expect(lastRequest!.body).toMatchObject({ amount: 11900, currency: "dzd", locale: "ar", webhook_endpoint: "http://localhost:3000/api/webhooks/chargily" });
    const row = await prisma.paymentCheckout.findFirstOrThrow({ where: { externalId: "chk_1" } });
    expect(row.amount.toString()).toBe("11900");
    expect(row.organizationId).toBe(ctx.org.id);
  });

  it("another tenant cannot create a checkout for this invoice", async () => {
    await expect(createInvoiceCheckout(other, invoiceId, "fr")).rejects.toThrow(/not found|NotFound/i);
  });

  it("portal users can pay only their own customer's invoices", async () => {
    const otherCustomer = await createCustomer(ctx, { name: "Client B" });
    const foreignInvoice = await openInvoice(ctx, otherCustomer.id);
    const portal = await addMember(ctx, "CUSTOMER_PORTAL", customerId);
    await expect(createInvoiceCheckout(portal, invoiceId, "fr")).resolves.toHaveProperty("url");
    await expect(createInvoiceCheckout(portal, foreignInvoice, "fr")).rejects.toThrow(/not found|NotFound/i);
  });

  it("roles without payments.record are refused", async () => {
    const driver = await addMember(ctx, "FIELD_WORKER");
    await expect(createInvoiceCheckout(driver, invoiceId, "fr")).rejects.toThrow(/forbidden|payments.record/i);
  });

  it("drafts cannot be paid online", async () => {
    const draft = await createDraftInvoice(ctx, { customerId, workOrderIds: [] });
    await expect(createInvoiceCheckout(ctx, draft.id, "fr")).rejects.toThrow("errors.payment.invoiceNotOpen");
  });

  it("live mode refuses to run without an https APP_URL", async () => {
    process.env.CHARGILY_MODE = "live";
    await expect(createInvoiceCheckout(ctx, invoiceId, "fr")).rejects.toThrow("errors.payment.providerUnavailable");
    delete process.env.CHARGILY_MODE;
  });

  it("is disabled when no secret key is configured", async () => {
    delete process.env.CHARGILY_SECRET_KEY;
    await expect(createInvoiceCheckout(ctx, invoiceId, "fr")).rejects.toThrow("errors.payment.onlineDisabled");
    process.env.CHARGILY_SECRET_KEY = KEY;
  });
});

describe("webhook", () => {
  it("signature check is exact and fails closed", () => {
    const raw = paidEvent("chk_1", 11900);
    expect(verifyChargilySignature(raw, sign(raw), KEY)).toBe(true);
    expect(verifyChargilySignature(raw + " ", sign(raw), KEY)).toBe(false);
    expect(verifyChargilySignature(raw, null, KEY)).toBe(false);
    expect(verifyChargilySignature(raw, sign(raw), undefined)).toBe(false);
    expect(verifyChargilySignature(raw, "zz", KEY)).toBe(false);
  });

  it("rejects unsigned events", async () => {
    const raw = paidEvent("chk_1", 11900);
    await expect(handleChargilyWebhook(raw, "0".repeat(64))).rejects.toThrow();
    expect((await getInvoice(ctx, invoiceId)).amountPaid.toString()).toBe("0");
  });

  it("an amount that does not match the checkout is not applied", async () => {
    const raw = paidEvent("chk_1", 100);
    expect(await handleChargilyWebhook(raw, sign(raw))).toEqual({ outcome: "amount_mismatch" });
    expect((await getInvoice(ctx, invoiceId)).amountPaid.toString()).toBe("0");
    expect(await prisma.auditEvent.count({ where: { action: "payment.checkout_mismatch" } })).toBe(1);
  });

  it("unknown checkouts are ignored", async () => {
    const raw = paidEvent("chk_does_not_exist", 11900);
    expect(await handleChargilyWebhook(raw, sign(raw))).toEqual({ outcome: "unknown_checkout" });
  });

  it("a paid event settles the invoice once; replays have no second effect", async () => {
    const raw = paidEvent("chk_1", 11900);
    const results = await Promise.all([handleChargilyWebhook(raw, sign(raw)), handleChargilyWebhook(raw, sign(raw))]);
    expect(results.map((r) => r.outcome).sort()).toEqual(["applied", "duplicate"]);
    const inv = await getInvoice(ctx, invoiceId);
    expect(inv.status).toBe("PAID");
    expect(inv.amountPaid.toString()).toBe("11900");
    expect(await prisma.payment.count({ where: { invoiceId } })).toBe(1);
    const p = await prisma.payment.findFirstOrThrow({ where: { invoiceId } });
    expect(p.method).toBe("CARD_ONLINE");
  });

  it("money received for an invoice already paid another way is flagged for reconciliation", async () => {
    const inv2 = await openInvoice(ctx, customerId, "1000");
    await createInvoiceCheckout(ctx, inv2, "fr");
    const chk = await prisma.paymentCheckout.findFirstOrThrow({ where: { invoiceId: inv2 } });
    await recordPayment(ctx, inv2, { amount: "1190", method: "BANK_TRANSFER", receivedAt: isoDay(0), idempotencyKey: "manual-transfer-0001" });
    const raw = paidEvent(chk.externalId, 1190);
    expect(await handleChargilyWebhook(raw, sign(raw))).toEqual({ outcome: "reconcile_required" });
    expect((await getInvoice(ctx, inv2)).amountPaid.toString()).toBe("1190");
    expect(await prisma.auditEvent.count({ where: { action: "payment.reconcile_required" } })).toBe(1);
  });

  it("failed and canceled checkouts are recorded without touching the invoice", async () => {
    const inv3 = await openInvoice(ctx, customerId, "500");
    await createInvoiceCheckout(ctx, inv3, "fr");
    const chk = await prisma.paymentCheckout.findFirstOrThrow({ where: { invoiceId: inv3 } });
    const raw = JSON.stringify({ type: "checkout.failed", data: { id: chk.externalId, status: "failed", amount: 595, currency: "dzd" } });
    expect(await handleChargilyWebhook(raw, sign(raw))).toEqual({ outcome: "recorded" });
    expect((await prisma.paymentCheckout.findUniqueOrThrow({ where: { id: chk.id } })).status).toBe("FAILED");
    expect((await getInvoice(ctx, inv3)).amountPaid.toString()).toBe("0");
  });
});
