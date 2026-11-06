import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { addMember, isoDay, jpegWithExif, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { addTeamMember, createTeam } from "@/server/services/fleet";
import { assignWorkOrder, collectionSlip, decodeSignatureDataUrl, getEvidenceForDownload, recordSignature, transitionWorkOrder, customerFeedback, addEvidence } from "@/server/services/work-orders";
import { applyFieldSignature, fieldBundle } from "@/server/services/field";
import type { OrgContext } from "@/server/context";

/** Collection slip (bon d'enlèvement): customer signature on site, online and offline, one per job, tenant-scoped. */
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const png = () => ({ name: "signature.png", bytes: new Uint8Array(Buffer.from(PNG_B64, "base64")) });

let a: OrgContext, b: OrgContext, driver: OrgContext, outsider: OrgContext, portal: OrgContext;
let teamId: string, customerId: string, locationId: string, vehicleId: string;
let n = 0;

async function job(status: "ASSIGNED" | "IN_PROGRESS" = "IN_PROGRESS") {
  n++;
  const wo = await prisma.workOrder.create({
    data: { organizationId: a.org.id, number: `WO-S${n}`, kind: "COLLECTION", status: "PLANNED", customerId, serviceLocationId: locationId, scheduledDate: new Date(`${isoDay(0)}T00:00:00Z`), createdById: a.userId },
  });
  await assignWorkOrder(a, wo.id, { teamId, vehicleId, scheduledDate: isoDay(0) });
  if (status === "IN_PROGRESS") await transitionWorkOrder(driver, wo.id, "start");
  return wo.id;
}

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Sign A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Sign B")).ctx;
  driver = await addMember(a, "FIELD_WORKER");
  outsider = await addMember(a, "FIELD_WORKER");
  teamId = (await createTeam(a, { name: "Equipe S" })).id;
  await addTeamMember(a, teamId, driver.membershipId);
  vehicleId = (await prisma.vehicle.create({ data: { organizationId: a.org.id, plateNumber: "00321-118-31", label: "Benne S", type: "COMPACTOR" } })).id;
  customerId = (await createCustomer(a, { name: "Client signataire (synthetic)" })).id;
  locationId = (await addServiceLocation(a, customerId, { label: "Site", addressLine: "Rue 2", commune: "Es Senia", latitude: "35.65", longitude: "-0.62" })).id;
  portal = await addMember(a, "CUSTOMER_PORTAL", customerId);
});

describe("customer signature", () => {
  it("the crew records it while the job is in progress; name, time, PNG evidence and audit are kept", async () => {
    const id = await job();
    const ev = await recordSignature(driver, id, { signerName: "M. Responsable" }, png());
    expect(ev.kind).toBe("SIGNATURE");
    const wo = await prisma.workOrder.findUniqueOrThrow({ where: { id } });
    expect(wo.signerName).toBe("M. Responsable");
    expect(wo.signedAt).not.toBeNull();
    const audit = await prisma.auditEvent.findFirstOrThrow({ where: { organizationId: a.org.id, entityId: id, action: "workorder.signed" } });
    expect((audit.data as { sha256: string }).sha256).toBe(ev.sha256);
    // The signature counts as proof of service: the job can be finished.
    expect(await transitionWorkOrder(driver, id, "complete")).toBe("COMPLETED");
    const slip = await collectionSlip(a, id);
    expect([slip.signature?.id, slip.wo.signerName]).toEqual([ev.id, "M. Responsable"]);
  });

  it("only once, only PNG, only by the crew, only in progress or just completed", async () => {
    const id = await job();
    await expect(recordSignature(driver, id, { signerName: "X" }, png())).rejects.toThrow("errors.validation");
    await expect(recordSignature(driver, id, { signerName: "Nom valide" }, { name: "s.png", bytes: jpegWithExif() })).rejects.toThrow("errors.upload.type");
    await expect(recordSignature(outsider, id, { signerName: "Nom valide" }, png())).rejects.toThrow("errors.forbidden");
    await recordSignature(driver, id, { signerName: "Nom valide" }, png());
    await expect(recordSignature(driver, id, { signerName: "Deuxième" }, png())).rejects.toThrow("errors.workOrder.alreadySigned");
    const assigned = await job("ASSIGNED");
    await expect(recordSignature(driver, assigned, { signerName: "Trop tôt" }, png())).rejects.toThrow("errors.workOrder.signatureClosed");
  });

  it("not after the customer confirmed the collection in the portal", async () => {
    const id = await job();
    await addEvidence(driver, id, "AFTER", { name: "p.jpg", bytes: jpegWithExif() });
    await transitionWorkOrder(driver, id, "complete");
    await customerFeedback(portal, id, { decision: "confirm" });
    await expect(recordSignature(driver, id, { signerName: "Trop tard" }, png())).rejects.toThrow("errors.workOrder.signatureClosed");
  });

  it("offline: the phone's time is kept, a replay is a duplicate, the bundle shows it signed", async () => {
    const id = await job();
    const ref = randomUUID();
    const signedAt = new Date(Date.now() - 10 * 60_000).toISOString();
    const first = await applyFieldSignature(driver, id, ref, "Gardien (synthetic)", signedAt, png());
    const again = await applyFieldSignature(driver, id, ref, "Gardien (synthetic)", signedAt, png());
    expect([first.outcome, again.outcome, again.evidenceId]).toEqual(["applied", "duplicate", first.evidenceId]);
    expect((await prisma.workOrder.findUniqueOrThrow({ where: { id } })).signedAt?.toISOString()).toBe(signedAt);
    expect((await fieldBundle(driver)).jobs.find((j) => j.id === id)?.signed).toBe(true);
    await expect(applyFieldSignature(driver, id, randomUUID(), "Futur", new Date(Date.now() + 3_600_000).toISOString(), png())).rejects.toThrow("errors.offline.occurredAt");
  });

  it("data URL decoding accepts only base64 PNG within the size limit", () => {
    expect(decodeSignatureDataUrl(`data:image/png;base64,${PNG_B64}`)?.length).toBeGreaterThan(10);
    expect(decodeSignatureDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(decodeSignatureDataUrl(`data:image/png;base64,${"A".repeat(500_000)}`)).toBeNull();
  });

  it("cross-tenant: another organization can neither sign, nor read the slip or the signature file", async () => {
    const id = await job();
    await expect(recordSignature(b, id, { signerName: "Intrus" }, png())).rejects.toThrow(/notFound/);
    const ev = await recordSignature(driver, id, { signerName: "Client A" }, png());
    await expect(collectionSlip(b, id)).rejects.toThrow(/notFound/);
    await expect(getEvidenceForDownload(b, ev.id)).rejects.toThrow(/notFound/);
    await expect(getEvidenceForDownload(portal, ev.id)).resolves.toMatchObject({ id: ev.id });
  });
});
