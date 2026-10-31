import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createContainer } from "@/server/services/containers";
import { createVehicle } from "@/server/services/fleet";
import { createCustomer } from "@/server/services/customers";
import { addManualLine, createDraftInvoice, issueInvoice } from "@/server/services/invoices";
import { authenticateIntegration, ingestLorawan, mapDecoded, normalizeEui, registerDevice, registerIntegration, revokeIntegration, vehiclePositions } from "@/server/services/iot";
import { processOutbox, sendInvoiceEmail } from "@/server/services/mailer";
import { runBilling, updateBillingSettings } from "@/server/services/billing";
import { setEmailProvider, type OutgoingEmail } from "@/server/email/provider";
import type { OrgContext } from "@/server/context";

let a: OrgContext;
let b: OrgContext;
let chirpKey: string;
let ttnKey: string;
const EUI = "70B3D57ED0012345";
const TRACKER_EUI = "70B3D57ED00ABCDE";
const sent: OutgoingEmail[] = [];
let failNext = 0;

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Alpha")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Beta")).ctx;
  const c = await createContainer(a, { code: "BAC-LORA", type: "BIN_660L" }).catch(() => createContainer(a, { code: "BAC-LORA", type: "SKIP_10M3" }));
  await registerDevice(a, { kind: "FILL_SENSOR", name: "LoRa bin", serial: "70-b3-d5-7e-d0-01-23-45", containerId: c.id });
  const v = await createVehicle(a, { plateNumber: "00999-120-31", label: "Camion", type: "COMPACTOR" });
  await registerDevice(a, { kind: "GPS_TRACKER", name: "LoRa GPS", serial: TRACKER_EUI, vehicleId: v.id });
  // Same DevEUI registered in another tenant must never receive A's data.
  const cb = await createContainer(b, { code: "BAC-B", type: "SKIP_10M3" });
  await registerDevice(b, { kind: "FILL_SENSOR", name: "B bin", serial: EUI, containerId: cb.id });
  chirpKey = (await registerIntegration(a, { provider: "CHIRPSTACK", name: "ChirpStack Oran" })).key;
  ttnKey = (await registerIntegration(a, { provider: "TTN", name: "TTN" })).key;
  setEmailProvider({ async send(m) { if (failNext > 0) { failNext--; throw new Error("smtp down (test)"); } sent.push(m); } });
});
afterAll(() => setEmailProvider(null));

describe("LoRaWAN adapters", () => {
  it("normalises DevEUIs and maps codec fields", () => {
    expect(normalizeEui("70-b3-d5-7e-d0-01-23-45")).toBe(EUI);
    expect(mapDecoded({ fill_level: "73", battery: 81, temperature: 24.5, other: "x" })).toMatchObject({ fillPct: 73, batteryPct: 81, temperatureC: 24.5 });
    expect(mapDecoded({ latitude: 35.7, longitude: -0.63, speed: 40 })).toMatchObject({ lat: 35.7, lng: -0.63, speedKmh: 40 });
  });

  it("keys are provider-specific and revocable", async () => {
    expect(await authenticateIntegration(`Bearer ${chirpKey}`, "TTN")).toBeNull();
    expect((await authenticateIntegration(`Bearer ${chirpKey}`, "CHIRPSTACK"))!.organizationId).toBe(a.org.id);
    expect(await authenticateIntegration("Bearer nxi_" + "x".repeat(43), "CHIRPSTACK")).toBeNull();
  });

  it("ChirpStack v4 uplink (camelCase, ?event=up) lands on the right device of the right tenant", async () => {
    const i = (await authenticateIntegration(`Bearer ${chirpKey}`, "CHIRPSTACK"))!;
    const body = { deduplicationId: "d1", time: new Date(Date.now() - 60_000).toISOString(), deviceInfo: { tenantId: "t", applicationId: "a", deviceName: "bin-1", devEui: EUI.toLowerCase() }, fPort: 2, data: "AQI=", object: { fillPct: 64, batteryPct: 90 } };
    expect(await ingestLorawan(i, body, "up")).toMatchObject({ outcome: "ingested", detail: { accepted: 1 } });
    expect(await ingestLorawan(i, body, "up")).toMatchObject({ outcome: "ingested", detail: { duplicates: 1 } });
    expect(await ingestLorawan(i, body, "join")).toEqual({ outcome: "ignored_event" });
    expect((await prisma.container.findFirstOrThrow({ where: { organizationId: a.org.id, code: "BAC-LORA" } })).lastFillPct).toBe(64);
    expect((await prisma.container.findFirstOrThrow({ where: { organizationId: b.org.id } })).lastFillPct).toBeNull();
  });

  it("The Things Stack v3 uplink (snake_case, hex dev_eui) — fill sensor and GPS tracker", async () => {
    const i = (await authenticateIntegration(`Bearer ${ttnKey}`, "TTN"))!;
    const up = (eui: string, decoded: object) => ({ end_device_ids: { device_id: "dev", application_ids: { application_id: "app" }, dev_eui: eui }, received_at: new Date().toISOString(), uplink_message: { f_port: 1, frm_payload: "AQ==", decoded_payload: decoded, received_at: new Date(Date.now() - 30_000).toISOString() } });
    expect(await ingestLorawan(i, up(EUI, { fill_level: 88 }), null)).toMatchObject({ outcome: "ingested", detail: { alerts: 1 } });
    expect(await ingestLorawan(i, up(TRACKER_EUI, { latitude: 35.6971, longitude: -0.6308, speed: 31.6 }), null)).toMatchObject({ outcome: "ingested" });
    expect(await ingestLorawan(i, up("0000000000000001", { fill_level: 1 }), null)).toEqual({ outcome: "unknown_device" });
    expect(await ingestLorawan(i, up(EUI, { unrelated: 1 }), null)).toEqual({ outcome: "no_decoded_fields" });
    expect(await ingestLorawan(i, { end_device_ids: { device_id: "dev", dev_eui: EUI }, join_accept: {} }, null)).toEqual({ outcome: "ignored_event" });
  });

  it("malformed payloads are rejected; revoked integrations stop working", async () => {
    const i = (await authenticateIntegration(`Bearer ${chirpKey}`, "CHIRPSTACK"))!;
    await expect(ingestLorawan(i, { time: "x" }, "up")).rejects.toThrow();
    await expect(revokeIntegration(b, i.id)).rejects.toThrow(/not found|NotFound/i);
    await revokeIntegration(a, i.id);
    expect(await authenticateIntegration(`Bearer ${chirpKey}`, "CHIRPSTACK")).toBeNull();
  });
});

describe("live vehicle positions", () => {
  it("returns the latest fix, tenant-scoped, last 24 h only", async () => {
    const [v] = await vehiclePositions(a);
    expect(v).toMatchObject({ plate: "00999-120-31", lat: 35.6971, lng: -0.6308, speedKmh: 32 });
    expect(await vehiclePositions(b)).toEqual([]);
    await prisma.vehicle.updateMany({ where: { organizationId: a.org.id }, data: { lastPositionAt: new Date(Date.now() - 25 * 3600_000) } });
    expect(await vehiclePositions(a)).toEqual([]);
    const portalCustomer = await createCustomer(a, { name: "P" });
    await expect(vehiclePositions(await addMember(a, "CUSTOMER_PORTAL", portalCustomer.id))).rejects.toThrow();
  });
});

describe("email", () => {
  let invoiceId: string;
  it("emails an issued invoice to the customer; content is escaped; drafts and other tenants refused", async () => {
    const c = await createCustomer(a, { name: "Client <b>gras</b>", email: "client@example.test" });
    const d = await createDraftInvoice(a, { customerId: c.id, workOrderIds: [] });
    await addManualLine(a, d.id, { description: "Collecte <script>x</script>", quantity: "1", unitPrice: "1000", taxRateBps: 1900 });
    await expect(sendInvoiceEmail(a, d.id, {})).rejects.toThrow("errors.email.invoiceNotIssued");
    await issueInvoice(a, d.id, { issueDate: isoDay(0), dueDate: isoDay(15) });
    invoiceId = d.id;
    await expect(sendInvoiceEmail(b, d.id, {})).rejects.toThrow(/not found|NotFound/i);
    const driver = await addMember(a, "FIELD_WORKER");
    await expect(sendInvoiceEmail(driver, d.id, {})).rejects.toThrow();
    expect(await sendInvoiceEmail(a, d.id, { message: "Merci <img src=x onerror=alert(1)>" })).toMatchObject({ to: "client@example.test", queued: true });
    expect(await processOutbox()).toMatchObject({ sent: 1, failed: 0 });
    const m = sent.at(-1)!;
    expect(m.to).toBe("client@example.test");
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<img");
    expect(m.html).toContain("&lt;script&gt;");
    expect(await prisma.auditEvent.count({ where: { action: "invoice.emailed", entityId: d.id } })).toBe(1);
  });

  it("retries with backoff, marks failed after 5 attempts, never sends twice concurrently", async () => {
    await sendInvoiceEmail(a, invoiceId, { to: "other@example.test" });
    failNext = 1;
    expect(await processOutbox()).toMatchObject({ sent: 0, failed: 1 });
    const n = await prisma.notification.findFirstOrThrow({ where: { recipient: "other@example.test" } });
    expect([n.attempts, !!n.lastError, n.nextAttemptAt > new Date()]).toEqual([1, true, true]);
    await prisma.notification.update({ where: { id: n.id }, data: { nextAttemptAt: new Date(0) } });
    const rs = await Promise.all([processOutbox(), processOutbox(), processOutbox()]);
    expect(rs.reduce((s, r) => s + r.sent, 0)).toBe(1);
    expect(sent.filter((m) => m.to === "other@example.test")).toHaveLength(1);
    await sendInvoiceEmail(a, invoiceId, { to: "dead@example.test" });
    failNext = 10;
    for (let k = 0; k < 5; k++) {
      await prisma.notification.updateMany({ where: { recipient: "dead@example.test" }, data: { nextAttemptAt: new Date(0) } });
      await processOutbox();
    }
    failNext = 0;
    expect((await prisma.notification.findFirstOrThrow({ where: { recipient: "dead@example.test" } })).failedAt).not.toBeNull();
  });

  it("without SMTP nothing is sent and messages wait", async () => {
    setEmailProvider(null);
    await sendInvoiceEmail(a, invoiceId, { to: "later@example.test" });
    expect(await processOutbox()).toMatchObject({ skipped: "not_configured", sent: 0 });
    expect((await prisma.notification.findFirstOrThrow({ where: { recipient: "later@example.test" } })).sentAt).toBeNull();
    setEmailProvider({ async send(m) { sent.push(m); } });
  });

  it("NEXVO billing emails the invoice to owners/admins and the organization address, in its language", async () => {
    const owner = (await prisma.user.create({ data: { email: "own@platform.test", name: "o", passwordHash: "x", isPlatformStaff: true, platformRole: "OWNER", totpEnabledAt: new Date() } })).id;
    await updateBillingSettings(owner, { enabled: "on", issuerName: "NEXVO (synthetic)", issuerTaxId: "000000000000000", taxRateBps: 1900, dueDays: 15, graceDays: 10 });
    await prisma.organization.update({ where: { id: b.org.id }, data: { email: "compta@beta.test", defaultLocale: "ar" } });
    await prisma.subscription.update({ where: { organizationId: b.org.id }, data: { status: "ACTIVE", currentPeriodEnd: new Date(Date.now() - 86400_000) } });
    await prisma.subscription.update({ where: { organizationId: a.org.id }, data: { status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 86400_000) } });
    const before = sent.length;
    await runBilling();
    // The message queued while SMTP was off goes out now too (nothing is lost).
    expect(sent.slice(before).some((m) => m.to === "later@example.test")).toBe(true);
    const mails = sent.slice(before).filter((m) => m.subject.includes("NXV-"));
    expect(mails.map((m) => m.to).sort()).toEqual(["compta@beta.test", (await prisma.user.findFirstOrThrow({ where: { memberships: { some: { organizationId: b.org.id, role: "OWNER" } } } })).email.toLowerCase()].sort());
    expect(mails[0]!.subject).toContain("NEXVO");
    expect(mails[0]!.html).toContain('dir="rtl"');
  });
});
