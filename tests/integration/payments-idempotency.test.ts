import { beforeAll, describe, expect, it } from "vitest";
import { isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createCustomer } from "@/server/services/customers";
import { addManualLine, createDraftInvoice, getInvoice, issueInvoice, processPaymentWebhook, recordPayment, reverseRecordedPayment, signWebhook } from "@/server/services/invoices";
import type { OrgContext } from "@/server/context";

/** Scenario I — retried or replayed payment events never create duplicate financial effects. */
const SECRET = "test-webhook-secret-0123456789";
let ctx: OrgContext;
let invoiceId: string;

beforeAll(async () => {
  await resetDb();
  ctx = (await newOrg()).ctx;
  const c = await createCustomer(ctx, { name: "Client" });
  const draft = await createDraftInvoice(ctx, { customerId: c.id, workOrderIds: [] });
  invoiceId = draft.id;
  await addManualLine(ctx, invoiceId, { description: "Location benne 30 m³", quantity: "1", unitPrice: "10000", taxRateBps: 1900 });
  await issueInvoice(ctx, invoiceId, { issueDate: isoDay(0), dueDate: isoDay(15) });
});

describe("manual payment idempotency", () => {
  it("the same idempotency key submitted twice records one payment", async () => {
    const input = { amount: "1000", method: "CASH", receivedAt: isoDay(0), idempotencyKey: "retry-key-123456" };
    const [r1, r2] = [await recordPayment(ctx, invoiceId, input), await recordPayment(ctx, invoiceId, input)];
    expect(r1.payment.id).toBe(r2.payment.id);
    expect(r2.duplicate).toBe(true);
    expect((await getInvoice(ctx, invoiceId)).amountPaid.toString()).toBe("1000");
  });

  it("reusing a key with a different amount is a conflict, not a silent success", async () => {
    await expect(recordPayment(ctx, invoiceId, { amount: "2000", method: "CASH", receivedAt: isoDay(0), idempotencyKey: "retry-key-123456" })).rejects.toThrow("errors.payment.idempotencyConflict");
  });

  it("concurrent payments cannot overpay (row lock)", async () => {
    const results = await Promise.allSettled(
      [1, 2, 3].map((i) => recordPayment(ctx, invoiceId, { amount: "6000", method: "BANK_TRANSFER", receivedAt: isoDay(0), idempotencyKey: `concurrent-${i}-abcdef` })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const inv = await getInvoice(ctx, invoiceId);
    expect(inv.amountPaid.toString()).toBe("7000");
    expect(Number(inv.amountPaid)).toBeLessThanOrEqual(Number(inv.total));
  });

  it("reversal restores the balance and status", async () => {
    const p = await prisma.payment.findFirstOrThrow({ where: { invoiceId, idempotencyKey: "retry-key-123456" } });
    await reverseRecordedPayment(ctx, p.id, { reason: "Chèque rejeté" });
    const inv = await getInvoice(ctx, invoiceId);
    expect(inv.amountPaid.toString()).toBe("6000");
    expect(inv.status).toBe("PARTIALLY_PAID");
    await expect(reverseRecordedPayment(ctx, p.id, { reason: "again" })).rejects.toThrow("errors.payment.alreadyReversed");
  });
});

describe("payment webhook", () => {
  const body = () =>
    JSON.stringify({ eventId: "evt_0001", type: "payment.succeeded", organizationId: ctx.org.id, invoiceId, amount: "5900.00", reference: "SATIM-REF-1", paidAt: isoDay(0) });

  it("rejects unsigned or tampered events", async () => {
    await expect(processPaymentWebhook("test", body(), null, SECRET)).rejects.toThrow("errors.forbidden");
    await expect(processPaymentWebhook("test", body(), signWebhook(body() + " ", SECRET), SECRET)).rejects.toThrow("errors.forbidden");
    await expect(processPaymentWebhook("test", body(), signWebhook(body(), SECRET), undefined)).rejects.toThrow("errors.forbidden");
  });

  it("applies a verified event exactly once across replays", async () => {
    const sig = signWebhook(body(), SECRET);
    const first = await processPaymentWebhook("test", body(), sig, SECRET);
    const replay = await processPaymentWebhook("test", body(), sig, SECRET);
    const replays = await Promise.all([1, 2, 3].map(() => processPaymentWebhook("test", body(), sig, SECRET)));
    expect(first.duplicate).toBe(false);
    expect(replay.duplicate).toBe(true);
    expect(replays.every((r) => r.duplicate)).toBe(true);
    const inv = await getInvoice(ctx, invoiceId);
    expect(inv.status).toBe("PAID");
    expect(inv.amountPaid.toString()).toBe("11900");
    expect(await prisma.payment.count({ where: { invoiceId, source: "WEBHOOK" } })).toBe(1);
  });
});
