import { beforeAll, describe, expect, it } from "vitest";
import { addMember, isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addMaintenance, addVehicleDocument, createVehicle, fleetAlerts, getVehicle, setVehicleStatus } from "@/server/services/fleet";
import type { OrgContext } from "@/server/context";

/** Vehicle documents and expiry alerts: latest document per kind, 30-day window, retired vehicles ignored, tenant-scoped. */
let a: OrgContext, b: OrgContext, viewer: OrgContext, driver: OrgContext;
let truck: string, old: string;

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Docs A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Docs B")).ctx;
  viewer = await addMember(a, "VIEWER");
  driver = await addMember(a, "FIELD_WORKER");
  truck = (await createVehicle(a, { plateNumber: "00010-120-31", label: "Benne", type: "COMPACTOR" })).id;
  old = (await createVehicle(a, { plateNumber: "00011-110-31", label: "Ancienne", type: "TIPPER" })).id;
});

describe("vehicle documents", () => {
  it("records documents; a renewal replaces the old one in the alerts", async () => {
    await addVehicleDocument(a, truck, { kind: "INSURANCE", reference: "POL-1", issuer: "Assureur (fictif)", issuedOn: isoDay(-360), expiresOn: isoDay(5) });
    let alerts = await fleetAlerts(a, isoDay(0));
    expect(alerts.map((x) => [x.kind, x.daysLeft, x.expired])).toEqual([["INSURANCE", 5, false]]);
    await addVehicleDocument(a, truck, { kind: "INSURANCE", reference: "POL-2", issuedOn: isoDay(4), expiresOn: isoDay(369) });
    alerts = await fleetAlerts(a, isoDay(0));
    expect(alerts).toEqual([]);
    expect((await getVehicle(a, truck)).documents.map((d) => d.reference)).toEqual(["POL-2", "POL-1"]);
  });

  it("expired documents and maintenance due are alerted, expired first; far dates are not", async () => {
    await addVehicleDocument(a, truck, { kind: "TECHNICAL_INSPECTION", expiresOn: isoDay(-3) });
    await addVehicleDocument(a, truck, { kind: "REGISTRATION", expiresOn: isoDay(400) });
    await addMaintenance(a, truck, { kind: "MAINTENANCE", performedAt: isoDay(-60), description: "Vidange", nextDueAt: isoDay(20) });
    const alerts = await fleetAlerts(a, isoDay(0));
    expect(alerts.map((x) => [x.kind, x.daysLeft, x.expired])).toEqual([["TECHNICAL_INSPECTION", -3, true], ["MAINTENANCE", 20, false]]);
  });

  it("retired vehicles are not alerted", async () => {
    await addVehicleDocument(a, old, { kind: "INSURANCE", expiresOn: isoDay(-1) });
    expect((await fleetAlerts(a, isoDay(0))).some((x) => x.vehicleId === old)).toBe(true);
    await setVehicleStatus(a, old, "RETIRED");
    expect((await fleetAlerts(a, isoDay(0))).some((x) => x.vehicleId === old)).toBe(false);
  });

  it("validates dates and permissions", async () => {
    await expect(addVehicleDocument(a, truck, { kind: "INSURANCE", issuedOn: isoDay(0), expiresOn: isoDay(-1) })).rejects.toThrow("errors.validation");
    await expect(addVehicleDocument(viewer, truck, { kind: "INSURANCE" })).rejects.toThrow("errors.forbidden");
    await expect(fleetAlerts(driver, isoDay(0))).rejects.toThrow("errors.forbidden");
    expect(await fleetAlerts(viewer, isoDay(0))).toHaveLength(2);
  });

  it("cross-tenant: another organization can neither add documents to nor see alerts of this fleet", async () => {
    await expect(addVehicleDocument(b, truck, { kind: "INSURANCE", expiresOn: isoDay(1) })).rejects.toThrow(/notFound/);
    expect(await fleetAlerts(b, isoDay(0))).toEqual([]);
    expect(await prisma.auditEvent.count({ where: { organizationId: a.org.id, action: "vehicle.document_added" } })).toBe(5);
  });
});
