import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { addMember, isoDay, jpegWithExif, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { addTeamMember, createTeam } from "@/server/services/fleet";
import { assignWorkOrder } from "@/server/services/work-orders";
import { createDestination } from "@/server/services/recycling";
import { applyFieldAction, applyFieldEvidence, checkOccurredAt, fieldBundle, MAX_OUTBOX_AGE_MS } from "@/server/services/field";
import type { OrgContext } from "@/server/context";

/** Offline driver app (D-77): bundle scoping, replay-safe actions, time bounds, tenant isolation. */
let a: OrgContext, b: OrgContext, driver: OrgContext, otherDriver: OrgContext, driverB: OrgContext;
let teamId: string, vehicleId: string, locationId: string, customerId: string, recycler: string;
let n = 0;

async function job(ctx: OrgContext, team: string, opts: { day?: number; status?: "ASSIGNED" | "PLANNED" } = {}) {
  n++;
  const wo = await prisma.workOrder.create({
    data: { organizationId: ctx.org.id, number: `WO-F${n}`, kind: "COLLECTION", status: "PLANNED", customerId: ctx === a ? customerId : undefined, serviceLocationId: ctx === a ? locationId : undefined, scheduledDate: new Date(`${isoDay(opts.day ?? 0)}T00:00:00Z`), createdById: ctx.userId },
  });
  if (opts.status !== "PLANNED") await assignWorkOrder(ctx, wo.id, { teamId: team, vehicleId: ctx === a ? vehicleId : undefined, scheduledDate: isoDay(opts.day ?? 0) });
  return wo.id;
}

const now = () => new Date().toISOString();

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Field A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Field B")).ctx;
  driver = await addMember(a, "FIELD_WORKER");
  otherDriver = await addMember(a, "FIELD_WORKER");
  driverB = await addMember(b, "FIELD_WORKER");
  teamId = (await createTeam(a, { name: "Equipe 1" })).id;
  await addTeamMember(a, teamId, driver.membershipId);
  const otherTeam = (await createTeam(a, { name: "Equipe 2" })).id;
  await addTeamMember(a, otherTeam, otherDriver.membershipId);
  const teamB = (await createTeam(b, { name: "Equipe B" })).id;
  await addTeamMember(b, teamB, driverB.membershipId);
  vehicleId = (await prisma.vehicle.create({ data: { organizationId: a.org.id, plateNumber: "00123-116-31", label: "Benne 1", type: "COMPACTOR" } })).id;
  customerId = (await createCustomer(a, { name: "Client terrain (synthetic)" })).id;
  locationId = (await addServiceLocation(a, customerId, { label: "Dépôt", addressLine: "Rue 1", commune: "Bir El Djir", latitude: "35.73", longitude: "-0.56" })).id;
  recycler = (await createDestination(a, { name: "Recycleur terrain", kind: "RECYCLER" })).id;
});

describe("field bundle", () => {
  it("holds only the driver's team jobs from yesterday to tomorrow, with destinations", async () => {
    const today = await job(a, teamId);
    const far = await job(a, teamId, { day: 5 });
    const unassigned = await job(a, teamId, { status: "PLANNED" });
    const bundle = await fieldBundle(driver);
    const ids = bundle.jobs.map((j) => j.id);
    expect(ids).toContain(today);
    expect(ids).not.toContain(far);
    expect(ids).not.toContain(unassigned);
    expect(bundle.destinations.map((x) => x.id)).toEqual([recycler]);
    const j = bundle.jobs.find((x) => x.id === today)!;
    expect([j.title, j.address, j.plate, j.lat]).toEqual(["Client terrain (synthetic)", "Rue 1, Bir El Djir", "00123-116-31", 35.73]);
    expect((await fieldBundle(otherDriver)).jobs).toEqual([]);
    expect((await fieldBundle(driverB)).jobs).toEqual([]);
  });
});

describe("queued actions", () => {
  it("replays the whole offline job (start, photo, weight, complete) without duplicates, keeping phone times", async () => {
    const id = await job(a, teamId);
    const startedAt = new Date(Date.now() - 3 * 3600_000).toISOString();
    const finishedAt = new Date(Date.now() - 2 * 3600_000).toISOString();
    const start = { id: randomUUID(), type: "start", workOrderId: id, occurredAt: startedAt };
    const photoRef = randomUUID();
    const weight = { id: randomUUID(), type: "weight", workOrderId: id, occurredAt: finishedAt, data: { grossKg: "1200", tareKg: "200", destinationId: recycler } };
    const complete = { id: randomUUID(), type: "complete", workOrderId: id, occurredAt: finishedAt, data: { completionNotes: "hors ligne" } };

    for (let round = 0; round < 2; round++) {
      const outcome = round === 0 ? "applied" : "duplicate";
      expect(await applyFieldAction(driver, start)).toMatchObject({ outcome, status: round === 0 ? "IN_PROGRESS" : "COMPLETED" });
      expect(await applyFieldEvidence(driver, id, "AFTER", photoRef, { name: "p.jpg", bytes: jpegWithExif() })).toMatchObject({ outcome });
      expect(await applyFieldAction(driver, weight)).toMatchObject({ outcome });
      expect(await applyFieldAction(driver, complete)).toMatchObject({ outcome, status: "COMPLETED" });
    }
    const wo = await prisma.workOrder.findUniqueOrThrow({ where: { id }, include: { weightTickets: true, evidence: true } });
    expect(wo.actualStart?.toISOString()).toBe(startedAt);
    expect(wo.actualEnd?.toISOString()).toBe(finishedAt);
    expect(wo.weightTickets).toHaveLength(1);
    expect(wo.weightTickets[0]!.weighedAt.toISOString()).toBe(finishedAt);
    expect(wo.weightTickets[0]!.netKg.toString()).toBe("1000");
    expect(wo.evidence).toHaveLength(1);
    expect(await prisma.auditEvent.count({ where: { organizationId: a.org.id, entityId: id, action: "workorder.complete" } })).toBe(1);
  });

  it("two concurrent deliveries of the same weight keep one ticket", async () => {
    const id = await job(a, teamId);
    await applyFieldAction(driver, { id: randomUUID(), type: "start", workOrderId: id, occurredAt: now() });
    const w = { id: randomUUID(), type: "weight", workOrderId: id, occurredAt: now(), data: { grossKg: "500", tareKg: "0", destinationId: recycler } };
    const r = await Promise.all([applyFieldAction(driver, w), applyFieldAction(driver, w), applyFieldAction(driver, w)]);
    expect(r.map((x) => x.outcome).sort()).toEqual(["applied", "duplicate", "duplicate"]);
    expect(await prisma.weightTicket.count({ where: { workOrderId: id } })).toBe(1);
  });

  it("refuses business-rule violations so the phone can show them (no photo, conflicting state)", async () => {
    const id = await job(a, teamId);
    await applyFieldAction(driver, { id: randomUUID(), type: "start", workOrderId: id, occurredAt: now() });
    await expect(applyFieldAction(driver, { id: randomUUID(), type: "complete", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.workOrder.evidenceRequired");
    await applyFieldAction(driver, { id: randomUUID(), type: "fail", workOrderId: id, occurredAt: now(), data: { failureReason: "NO_ACCESS" } });
    await expect(applyFieldAction(driver, { id: randomUUID(), type: "complete", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.invalidTransition");
    // A clientRef reused on another job is not silently accepted.
    const ref = randomUUID();
    const j1 = await job(a, teamId), j2 = await job(a, teamId);
    for (const j of [j1, j2]) await applyFieldAction(driver, { id: randomUUID(), type: "start", workOrderId: j, occurredAt: now() });
    await applyFieldAction(driver, { id: ref, type: "weight", workOrderId: j1, occurredAt: now(), data: { grossKg: "10", tareKg: "0" } });
    await expect(applyFieldAction(driver, { id: ref, type: "weight", workOrderId: j2, occurredAt: now(), data: { grossKg: "10", tareKg: "0" } })).rejects.toThrow("errors.validation");
  });

  it("bounds the phone's clock: no future beyond 5 minutes, nothing older than 7 days", () => {
    const t = Date.UTC(2026, 10, 1, 12);
    expect(() => checkOccurredAt(new Date(t + 6 * 60_000).toISOString(), t)).toThrow("errors.offline.occurredAt");
    expect(() => checkOccurredAt(new Date(t - MAX_OUTBOX_AGE_MS - 1000).toISOString(), t)).toThrow("errors.offline.occurredAt");
    expect(checkOccurredAt(new Date(t + 2 * 60_000).toISOString(), t).getTime()).toBe(t); // small skew clamped to server time
    expect(checkOccurredAt(new Date(t - 3600_000).toISOString(), t).getTime()).toBe(t - 3600_000);
  });

  it("rejects malformed actions", async () => {
    const id = await job(a, teamId);
    await expect(applyFieldAction(driver, { id: "x", type: "start", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.validation");
    await expect(applyFieldAction(driver, { id: randomUUID(), type: "cancel", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.validation");
    await expect(applyFieldAction(driver, null)).rejects.toThrow("errors.validation");
  });
});

describe("authorization", () => {
  it("another team's driver can neither act on nor probe the job, even as a replay", async () => {
    const id = await job(a, teamId);
    await expect(applyFieldAction(otherDriver, { id: randomUUID(), type: "start", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.forbidden");
    await applyFieldAction(driver, { id: randomUUID(), type: "start", workOrderId: id, occurredAt: now() });
    await expect(applyFieldAction(otherDriver, { id: randomUUID(), type: "start", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.forbidden");
    await expect(applyFieldEvidence(otherDriver, id, "AFTER", randomUUID(), { name: "p.jpg", bytes: jpegWithExif() })).rejects.toThrow("errors.forbidden");
  });

  it("cross-tenant: another organization's driver gets not-found on every write", async () => {
    const id = await job(a, teamId);
    await expect(applyFieldAction(driverB, { id: randomUUID(), type: "start", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.notFound");
    await expect(applyFieldAction(driverB, { id: randomUUID(), type: "weight", workOrderId: id, occurredAt: now(), data: { grossKg: "1", tareKg: "0" } })).rejects.toThrow("errors.notFound");
    await expect(applyFieldEvidence(driverB, id, "BEFORE", randomUUID(), { name: "p.jpg", bytes: jpegWithExif() })).rejects.toThrow("errors.notFound");
    expect((await prisma.workOrder.findUniqueOrThrow({ where: { id } })).status).toBe("ASSIGNED");
  });

  it("support sessions and portal users cannot write", async () => {
    const id = await job(a, teamId);
    await expect(applyFieldAction({ ...driver, support: { grantId: "g", expiresAt: new Date(Date.now() + 3600_000) } }, { id: randomUUID(), type: "start", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.support.readOnly");
    const portal = await addMember(a, "CUSTOMER_PORTAL", customerId);
    await expect(applyFieldAction(portal, { id: randomUUID(), type: "start", workOrderId: id, occurredAt: now() })).rejects.toThrow("errors.forbidden");
    await expect(fieldBundle(portal)).rejects.toThrow("errors.forbidden");
  });
});
