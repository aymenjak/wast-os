import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createContainer } from "@/server/services/containers";
import { createVehicle } from "@/server/services/fleet";
import { authenticateDevice, fillForecasts, ingest, iotKpis, registerDevice, resolveAlert, revokeDevice } from "@/server/services/iot";
import type { OrgContext } from "@/server/context";

/** IoT: device keys, tenant binding, idempotent ingestion, alerts, forecast, permissions. */
let a: OrgContext;
let b: OrgContext;
let containerId: string;
let vehicleId: string;
let sensorKey: string;
let trackerKey: string;
const auth = (k: string) => authenticateDevice(`Bearer ${k}`);
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

beforeAll(async () => {
  await resetDb();
  a = (await newOrg()).ctx;
  b = (await newOrg()).ctx;
  containerId = (await createContainer(a, { code: "SKP-IOT", type: "SKIP_10M3" })).id;
  vehicleId = (await createVehicle(a, { plateNumber: "00123-120-31", label: "Benne 1", type: "COMPACTOR" })).id;
});

describe("device registration", () => {
  it("returns a one-time key and stores only its hash", async () => {
    const r = await registerDevice(a, { kind: "FILL_SENSOR", name: "Capteur 1", serial: "SN-001", containerId });
    sensorKey = r.key;
    expect(sensorKey).toMatch(/^nxd_[A-Za-z0-9_-]{43}$/);
    const d = await prisma.iotDevice.findUniqueOrThrow({ where: { id: r.device.id } });
    expect(d.keyHash).not.toContain(sensorKey.slice(4));
    trackerKey = (await registerDevice(a, { kind: "GPS_TRACKER", name: "GPS 1", serial: "SN-002", vehicleId })).key;
  });

  it("cannot link a device to another tenant's container, needs fleet.write, rejects duplicates", async () => {
    await expect(registerDevice(b, { kind: "FILL_SENSOR", name: "x", serial: "SN-X", containerId })).rejects.toThrow(/not found|NotFound/i);
    const driver = await addMember(a, "FIELD_WORKER");
    await expect(registerDevice(driver, { kind: "FILL_SENSOR", name: "x", serial: "SN-Y", containerId })).rejects.toThrow();
    await expect(registerDevice(a, { kind: "FILL_SENSOR", name: "x", serial: "SN-001", containerId })).rejects.toThrow("errors.iot.serialExists");
    await expect(registerDevice(a, { kind: "FILL_SENSOR", name: "x", serial: "SN-Z" })).rejects.toThrow();
  });
});

describe("ingestion", () => {
  it("rejects bad, unknown or malformed keys", async () => {
    expect(await authenticateDevice(null)).toBeNull();
    expect(await authenticateDevice("Bearer nxd_" + "A".repeat(43))).toBeNull();
    expect(await authenticateDevice(`Basic ${sensorKey}`)).toBeNull();
    expect((await auth(sensorKey))!.organizationId).toBe(a.org.id);
  });

  it("stores readings once (retries are harmless) and keeps the latest fill on the container", async () => {
    const d = (await auth(sensorKey))!;
    const batch = { readings: [{ measuredAt: hoursAgo(48), fillPct: 20, batteryPct: 90 }, { measuredAt: hoursAgo(24), fillPct: 40 }, { measuredAt: hoursAgo(1), fillPct: 60 }] };
    expect(await ingest(d, batch)).toMatchObject({ accepted: 3, duplicates: 0 });
    expect(await ingest(d, batch)).toMatchObject({ accepted: 0, duplicates: 3 });
    const c = await prisma.container.findUniqueOrThrow({ where: { id: containerId } });
    expect(c.lastFillPct).toBe(60);
    expect(await prisma.sensorReading.count({ where: { organizationId: b.org.id } })).toBe(0);
  });

  it("rejects out-of-range values and timestamps far in the future or past", async () => {
    const d = (await auth(sensorKey))!;
    await expect(ingest(d, { readings: [{ measuredAt: hoursAgo(0), fillPct: 140 }] })).rejects.toThrow();
    expect(await ingest(d, { readings: [{ measuredAt: new Date(Date.now() + 3600_000).toISOString(), fillPct: 10 }, { measuredAt: hoursAgo(24 * 40), fillPct: 10 }] })).toMatchObject({ accepted: 0, rejected: 2 });
    await expect(ingest(d, { readings: Array.from({ length: 101 }, (_, i) => ({ measuredAt: hoursAgo(i), fillPct: 1 })) })).rejects.toThrow();
  });

  it("a fill sensor cannot send positions and vice versa", async () => {
    await expect(ingest((await auth(sensorKey))!, { positions: [{ recordedAt: hoursAgo(0), lat: 35.7, lng: -0.6 }] })).rejects.toThrow();
    await expect(ingest((await auth(trackerKey))!, { readings: [{ measuredAt: hoursAgo(0), fillPct: 5 }] })).rejects.toThrow();
  });

  it("GPS positions update the vehicle's last fix, newest wins", async () => {
    const d = (await auth(trackerKey))!;
    await ingest(d, { positions: [{ recordedAt: hoursAgo(0.1), lat: 35.7, lng: -0.63, speedKmh: 30 }, { recordedAt: hoursAgo(0.5), lat: 35.6, lng: -0.6 }] });
    await ingest(d, { positions: [{ recordedAt: hoursAgo(2), lat: 1, lng: 1 }] });
    const v = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    expect([v.lastLatitude?.toString(), v.lastLongitude?.toString(), v.lastSpeedKmh]).toEqual(["35.7", "-0.63", 30]);
  });
});

describe("alerts and forecast", () => {
  it("forecasts when the bin reaches the threshold (~20 %/day from 60 % → 80 % in about a day)", async () => {
    const [f] = await fillForecasts(a);
    expect(f!.id).toBe(containerId);
    expect(f!.forecast!.ratePctPerDay).toBeCloseTo(20, 0);
    const hours = (f!.forecast!.thresholdAt!.getTime() - Date.now()) / 3600_000;
    expect(hours).toBeGreaterThan(18);
    expect(hours).toBeLessThan(26);
  });

  it("opens one fill alert at the threshold, battery and fire alerts, and auto-closes the fill alert after emptying", async () => {
    const d = (await auth(sensorKey))!;
    expect((await ingest(d, { readings: [{ measuredAt: hoursAgo(0.5), fillPct: 85, batteryPct: 12, temperatureC: 64 }] })).alerts).toBe(3);
    expect((await ingest(d, { readings: [{ measuredAt: hoursAgo(0.4), fillPct: 90 }] })).alerts).toBe(0);
    expect((await iotKpis(a)).openAlerts).toEqual({ FILL_HIGH: 1, BATTERY_LOW: 1, FIRE_RISK: 1 });
    expect((await iotKpis(a)).binsFullWithin48h).toBe(1);
    await ingest(d, { readings: [{ measuredAt: hoursAgo(0.1), fillPct: 5 }] });
    const fill = await prisma.iotAlert.findFirstOrThrow({ where: { kind: "FILL_HIGH" } });
    expect([!!fill.resolvedAt, fill.autoResolved]).toEqual([true, true]);
  });

  it("concurrent batches never open duplicate alerts", async () => {
    const d = (await auth(sensorKey))!;
    await Promise.all([1, 2, 3].map((i) => ingest(d, { readings: [{ measuredAt: new Date(Date.now() - i * 1000).toISOString(), fillPct: 95 }] })));
    expect(await prisma.iotAlert.count({ where: { kind: "FILL_HIGH", resolvedAt: null } })).toBe(1);
  });

  it("alerts are resolved only inside the tenant", async () => {
    const alert = await prisma.iotAlert.findFirstOrThrow({ where: { kind: "FIRE_RISK", resolvedAt: null } });
    await expect(resolveAlert(b, alert.id)).rejects.toThrow(/not found|NotFound/i);
    await resolveAlert(a, alert.id);
  });
});

describe("revocation and suspension", () => {
  it("a revoked device or a suspended organization can no longer send data", async () => {
    const d = (await auth(trackerKey))!;
    await expect(revokeDevice(b, d.id)).rejects.toThrow(/not found|NotFound/i);
    await revokeDevice(a, d.id);
    expect(await auth(trackerKey)).toBeNull();
    await prisma.organization.update({ where: { id: a.org.id }, data: { suspendedAt: new Date(), suspendedReason: "test" } });
    expect(await auth(sensorKey)).toBeNull();
    await prisma.organization.update({ where: { id: a.org.id }, data: { suspendedAt: null, suspendedReason: null } });
  });
});
