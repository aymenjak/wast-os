import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { resolveSession, createSessionRecord } from "@/server/services/accounts";
import {
  billingSettings, createPlatformCheckout, handlePlatformChargilyWebhook, organizationBilling, recordPlatformPayment,
  runBilling, updateBillingSettings, voidPlatformInvoice,
} from "@/server/services/billing";
import { setChargilyFetch } from "@/server/payments/chargily";

/** NEXVO subscription billing: idempotent run, gapless numbers, dunning, auto-suspension, payments, webhook. */
const PLATFORM_KEY = "test_sk_platform_nexvo_000000";
let ownerId: string;
let adminId: string;
let a: Awaited<ReturnType<typeof newOrg>>;
let b: Awaited<ReturnType<typeof newOrg>>;
let muni: Awaited<ReturnType<typeof newOrg>>;
const settings = { enabled: "on", issuerName: "NEXVO SARL (synthetic)", issuerTaxId: "000000000000000", taxRateBps: 1900, dueDays: 15, graceDays: 10 };
const sub = (orgId: string, data: Record<string, unknown>) => prisma.subscription.update({ where: { organizationId: orgId }, data });

beforeAll(async () => {
  await resetDb();
  const mk = (email: string, role: "OWNER" | "ADMIN") => prisma.user.create({ data: { email, name: email, passwordHash: "x", isPlatformStaff: true, platformRole: role, totpEnabledAt: new Date() } }).then((u) => u.id);
  ownerId = await mk("owner@billing.test", "OWNER");
  adminId = await mk("admin@billing.test", "ADMIN");
  a = await newOrg("SERVICE_PROVIDER", "Alpha Collecte");
  b = await newOrg("SERVICE_PROVIDER", "Beta Collecte");
  muni = await newOrg("MUNICIPALITY", "APC Billing");
  // A: trial ended yesterday (Starter monthly 9 900). B: active, period ends in 10 days.
  await sub(a.org.id, { planCode: "STARTER", status: "TRIAL", currentPeriodEnd: new Date("2026-10-30") });
  await sub(b.org.id, { planCode: "PRO", status: "ACTIVE", currentPeriodEnd: new Date("2026-11-10") });
  if (await prisma.subscription.findUnique({ where: { organizationId: muni.org.id } })) await sub(muni.org.id, { status: "ACTIVE", currentPeriodEnd: new Date("2026-01-01") });
});
afterAll(() => {
  delete process.env.CHARGILY_SECRET_KEY;
  setChargilyFetch((...x) => fetch(...x));
});

describe("configuration", () => {
  it("issues nothing until the owner enables billing with legal details", async () => {
    expect(await runBilling({ today: "2026-10-31" })).toMatchObject({ skipped: "not_configured", issued: 0 });
    await expect(updateBillingSettings(adminId, settings)).rejects.toThrow();
    await expect(updateBillingSettings(ownerId, { ...settings, issuerTaxId: "" })).rejects.toThrow();
    await updateBillingSettings(ownerId, settings);
    expect((await billingSettings()).enabled).toBe(true);
  });
});

describe("billing run", () => {
  it("converts the ended trial, invoices it with VAT, skips municipalities and future periods", async () => {
    const r = await runBilling({ today: "2026-10-31" });
    expect(r.issued).toBe(1);
    const inv = await prisma.platformInvoice.findFirstOrThrow({ where: { organizationId: a.org.id } });
    expect([inv.number, inv.subtotal.toString(), inv.taxTotal.toString(), inv.total.toString()]).toEqual(["NXV-2026-00001", "9900", "1881", "11781"]);
    expect(inv.periodStart.toISOString().slice(0, 10)).toBe("2026-10-30");
    expect(inv.periodEnd.toISOString().slice(0, 10)).toBe("2026-11-30");
    expect(inv.dueDate.toISOString().slice(0, 10)).toBe("2026-11-15");
    expect((inv.issuer as { taxId: string }).taxId).toBe("000000000000000");
    const s = await prisma.subscription.findUniqueOrThrow({ where: { organizationId: a.org.id } });
    expect([s.status, s.currentPeriodEnd.toISOString().slice(0, 10)]).toEqual(["ACTIVE", "2026-11-30"]);
    expect(await prisma.platformInvoice.count({ where: { organizationId: { in: [b.org.id, muni.org.id] } } })).toBe(0);
  });

  it("running again the same day changes nothing", async () => {
    expect((await runBilling({ today: "2026-10-31" })).issued).toBe(0);
    expect(await prisma.platformInvoice.count()).toBe(1);
  });

  it("catches up missed periods with gapless numbers; month-end dates are clamped", async () => {
    await sub(b.org.id, { currentPeriodEnd: new Date("2026-08-31") });
    const r = await runBilling({ today: "2026-10-31" });
    expect(r.issued).toBe(3);
    const nums = (await prisma.platformInvoice.findMany({ where: { organizationId: b.org.id }, orderBy: { periodStart: "asc" } })).map((i) => [i.number, i.periodStart.toISOString().slice(0, 10)]);
    expect(nums).toEqual([["NXV-2026-00002", "2026-08-31"], ["NXV-2026-00003", "2026-09-30"], ["NXV-2026-00004", "2026-10-30"]]);
  });

  it("concurrent runs never duplicate an invoice", async () => {
    await sub(a.org.id, { currentPeriodEnd: new Date("2026-11-30") });
    const rs = await Promise.all([runBilling({ today: "2026-11-30" }), runBilling({ today: "2026-11-30" })]);
    // A and B are both due on 30 Nov: exactly one invoice each, whichever run issued it.
    expect(rs[0].issued + rs[1].issued).toBe(2);
    const all = await prisma.platformInvoice.findMany({ orderBy: { number: "asc" } });
    expect(all.map((i) => i.number)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `NXV-2026-0000${n}`));
    expect(new Set(all.map((i) => `${i.organizationId}:${i.periodStart.toISOString()}`)).size).toBe(all.length);
  });

  it("yearly cycle uses the yearly price", async () => {
    const c = await newOrg("SERVICE_PROVIDER", "Gamma");
    await sub(c.org.id, { planCode: "PRO", status: "ACTIVE", billingCycle: "YEARLY", currentPeriodEnd: new Date("2026-11-30") });
    await runBilling({ today: "2026-11-30" });
    const inv = await prisma.platformInvoice.findFirstOrThrow({ where: { organizationId: c.org.id } });
    expect([inv.subtotal.toString(), inv.periodEnd.toISOString().slice(0, 10)]).toEqual(["299000", "2027-11-30"]);
  });
});

describe("dunning and suspension", () => {
  it("overdue → PAST_DUE; no suspension while auto-suspension is off", async () => {
    await runBilling({ today: "2026-12-20" });
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: a.org.id } })).status).toBe("PAST_DUE");
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: a.org.id } })).suspendedAt).toBeNull();
  });

  it("with auto-suspension on, unpaid beyond the grace period suspends; payment lifts it automatically", async () => {
    await updateBillingSettings(ownerId, { ...settings, autoSuspend: "on" });
    const token = await createSessionRecord(prisma, a.user.id, a.org.id);
    await runBilling({ today: "2026-12-20" });
    let org = await prisma.organization.findUniqueOrThrow({ where: { id: a.org.id } });
    expect([!!org.suspendedAt, org.suspendedByBilling]).toEqual([true, true]);
    expect((await resolveSession(token))!.ctx).toBeNull();
    for (const inv of await prisma.platformInvoice.findMany({ where: { organizationId: a.org.id, status: "ISSUED" } })) {
      await recordPlatformPayment(adminId, inv.id, { method: "BANK_TRANSFER", reference: "VIR-123", paidAt: "2026-12-21" });
    }
    org = await prisma.organization.findUniqueOrThrow({ where: { id: a.org.id } });
    expect([org.suspendedAt, org.suspendedByBilling]).toEqual([null, false]);
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: a.org.id } })).status).toBe("ACTIVE");
    expect((await resolveSession(token))!.ctx).not.toBeNull();
  });

  it("a manual suspension is never lifted by billing", async () => {
    await prisma.organization.update({ where: { id: a.org.id }, data: { suspendedAt: new Date(), suspendedReason: "manual (test)" } });
    await runBilling({ today: "2026-12-21" });
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: a.org.id } })).suspendedAt).not.toBeNull();
    await prisma.organization.update({ where: { id: a.org.id }, data: { suspendedAt: null, suspendedReason: null } });
  });

  it("voiding needs a reason and cannot touch a paid invoice", async () => {
    const paid = await prisma.platformInvoice.findFirstOrThrow({ where: { organizationId: a.org.id, status: "PAID" } });
    await expect(voidPlatformInvoice(adminId, paid.id, { reason: "x" })).rejects.toThrow("errors.payment.invoiceNotOpen");
    const open = await prisma.platformInvoice.findFirstOrThrow({ where: { organizationId: b.org.id, status: "ISSUED" } });
    await expect(voidPlatformInvoice(adminId, open.id, { reason: "" })).rejects.toThrow();
    await voidPlatformInvoice(adminId, open.id, { reason: "Geste commercial (test)" });
  });
});

describe("organization side and online payment", () => {
  it("only owners/admins of the organization see its invoices", async () => {
    const r = await organizationBilling(b.ctx);
    expect(r.invoices.every((i) => i.organizationId === b.org.id)).toBe(true);
    expect(r.invoices.length).toBeGreaterThan(0);
    const driver = await addMember(b.ctx, "FIELD_WORKER");
    await expect(organizationBilling(driver)).rejects.toThrow();
    const open = await prisma.platformInvoice.findFirstOrThrow({ where: { organizationId: b.org.id, status: "ISSUED" } });
    await expect(createPlatformCheckout(a.ctx, open.id, "fr")).rejects.toThrow();
  });

  it("pays a NEXVO invoice online into NEXVO's account; replay and wrong amount have no effect", async () => {
    process.env.CHARGILY_SECRET_KEY = PLATFORM_KEY;
    let auth = "";
    setChargilyFetch(async (_u, init) => {
      auth = new Headers(init?.headers).get("authorization") ?? "";
      return new Response(JSON.stringify({ id: "chk_platform_1", checkout_url: "https://pay.chargily.net/test/checkout/chk_platform_1" }), { status: 200 });
    });
    const open = await prisma.platformInvoice.findFirstOrThrow({ where: { organizationId: b.org.id, status: "ISSUED" }, orderBy: { number: "asc" } });
    await createPlatformCheckout(b.ctx, open.id, "ar");
    expect(auth).toBe(`Bearer ${PLATFORM_KEY}`);
    const ev = (amount: number) => JSON.stringify({ type: "checkout.paid", data: { id: "chk_platform_1", status: "paid", amount, currency: "dzd" } });
    const sign = (raw: string, k = PLATFORM_KEY) => createHmac("sha256", k).update(raw).digest("hex");
    await expect(handlePlatformChargilyWebhook(ev(1), sign(ev(1), "test_sk_some_tenant_key_00000"))).rejects.toThrow();
    expect(await handlePlatformChargilyWebhook(ev(1), sign(ev(1)))).toEqual({ outcome: "amount_mismatch" });
    const good = ev(Number(open.total));
    const both = await Promise.all([handlePlatformChargilyWebhook(good, sign(good)), handlePlatformChargilyWebhook(good, sign(good))]);
    expect(both.map((x) => x.outcome).sort()).toEqual(["applied", "duplicate"]);
    expect((await prisma.platformInvoice.findUniqueOrThrow({ where: { id: open.id } })).status).toBe("PAID");
  });
});
