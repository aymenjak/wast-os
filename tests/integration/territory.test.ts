import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { createContainer, moveContainer } from "@/server/services/containers";
import { createDestination } from "@/server/services/recycling";
import { assignContainer, createCampaign, createDropOffPoint, listCampaigns, listDropOffPoints, setLocalTarget, territoryLedger, territoryReport } from "@/server/services/territory";
import type { OrgContext } from "@/server/context";

/** R3 territory: commune/wilaya figures from tickets only, targets, campaigns before/after, drop-off points — tenant-scoped. */
let a: OrgContext;
let b: OrgContext;
let recycler: string, landfill: string;
const DAY = 86400_000;
const day = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

async function ticket(ctx: OrgContext, locId: string, category: string, kg: number, destinationId: string | null, at: Date, custId: string) {
  const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: ctx.org.id, code: category } });
  const n = await prisma.workOrder.count({ where: { organizationId: ctx.org.id } });
  const wo = await prisma.workOrder.create({
    data: { organizationId: ctx.org.id, number: `WO-TR${n + 1}`, kind: "COLLECTION", status: "COMPLETED", customerId: custId, serviceLocationId: locId, wasteCategoryId: cat.id, scheduledDate: at, createdById: ctx.userId },
  });
  await prisma.weightTicket.create({ data: { organizationId: ctx.org.id, workOrderId: wo.id, grossKg: String(kg + 1000), tareKg: "1000", netKg: String(kg), weighedAt: at, recordedById: ctx.userId, stream: cat.stream, destinationId } });
}

beforeAll(async () => {
  await resetDb();
  a = (await newOrg()).ctx;
  b = (await newOrg()).ctx;
  recycler = (await createDestination(a, { name: "Recycleur T (synthetic)", kind: "RECYCLER" })).id;
  landfill = (await createDestination(a, { name: "CET T (synthetic)", kind: "LANDFILL" })).id;
  const cust = (await createCustomer(a, { name: "Client T (synthetic)" })).id;
  const bir = (await addServiceLocation(a, cust, { label: "Bir El Djir site", addressLine: "Rue 1", commune: "Bir El Djir", wilaya: "Oran" })).id;
  const es = (await addServiceLocation(a, cust, { label: "Es Senia site", addressLine: "Rue 2", commune: "Es Senia", wilaya: "Oran" })).id;
  const now = new Date();
  await ticket(a, bir, "CARDBOARD", 300, recycler, now, cust);
  await ticket(a, bir, "MSW", 700, landfill, now, cust);
  await ticket(a, es, "MSW", 500, landfill, now, cust);
  await ticket(a, es, "CARDBOARD", 100, null, now, cust); // untracked
  // Campaign evaluation data: 10 days before → little cardboard recovered; during → more.
  await ticket(a, bir, "CARDBOARD", 50, recycler, new Date(Date.now() - 8 * DAY), cust);
});

describe("territory report", () => {
  it("groups tickets by commune and wilaya, with overall and material rates; other tenants see nothing", async () => {
    const r = await territoryReport(a, { from: day(0), to: day(0) });
    const bir = r.communes.find((c) => c.commune === "Bir El Djir")!;
    expect(bir.wilaya).toBe("Oran");
    expect(bir.rate).toBeCloseTo(0.3, 5); // 300 / 1000
    expect(bir.materialRate).toBeCloseTo(0.3, 5);
    const es = r.communes.find((c) => c.commune === "Es Senia")!;
    expect(es.untracked).toBe(10000);
    expect(es.rate).toBe(0);
    expect(r.total.rate).toBeCloseTo(300 / 1600, 5);
    expect((await territoryReport(b, { from: day(0), to: day(0) })).communes).toHaveLength(0);
    await expect(territoryReport(await addMember(a, "FIELD_WORKER"), { from: day(0), to: day(0) })).rejects.toThrow();
    const ledger = await territoryLedger(a, day(0), day(0));
    expect(ledger.find((l) => l.commune === "Bir El Djir" && l.stream === "PAPER_CARDBOARD")).toMatchObject({ totalKg: 300, materialKg: 300, disposedKg: 0 });
  });

  it("local target is optional, needs a year, admins only", async () => {
    await expect(setLocalTarget(a, { recoveryTargetPct: "35", recoveryTargetYear: "" })).rejects.toThrow("errors.validation");
    await expect(setLocalTarget(await addMember(a, "DISPATCHER"), { recoveryTargetPct: "35", recoveryTargetYear: "2029" })).rejects.toThrow();
    await setLocalTarget(a, { recoveryTargetPct: "35", recoveryTargetYear: "2029", recoveryTargetLabel: "Plan communal (synthetic)" });
    expect((await territoryReport(a, { from: day(0), to: day(0) })).localTarget).toEqual({ rate: 0.35, year: 2029, label: "Plan communal (synthetic)" });
    await setLocalTarget(a, { recoveryTargetPct: "", recoveryTargetYear: "" });
    expect((await territoryReport(a, { from: day(0), to: day(0) })).localTarget).toBeNull();
  });
});

describe("sorting campaigns", () => {
  it("compares the campaign period with the same length just before, on its commune and materials", async () => {
    await expect(createCampaign(a, { name: "X", commune: "Bir El Djir", startsOn: day(0), endsOn: day(-1), streams: ["PAPER_CARDBOARD"] })).rejects.toThrow("errors.validation");
    await expect(createCampaign(await addMember(a, "FIELD_WORKER"), { name: "X", commune: "Bir El Djir", startsOn: day(-6), endsOn: day(2), streams: ["PAPER_CARDBOARD"] })).rejects.toThrow();
    await createCampaign(a, { name: "Tri du carton (synthetic)", commune: "Bir El Djir", startsOn: day(-6), endsOn: day(2), streams: ["PAPER_CARDBOARD"] });
    await createCampaign(a, { name: "Future", commune: "Es Senia", startsOn: day(5), endsOn: day(9), streams: ["PET"] });
    const list = await listCampaigns(a);
    const c = list.find((x) => x.name.startsWith("Tri du carton"))!;
    expect(c.status).toBe("running");
    expect(c.during).toMatchObject({ recoveredKg: 300, tickets: 1 }); // MSW excluded: not a campaign material
    expect(c.before).toMatchObject({ recoveredKg: 50, tickets: 1 });
    expect(c.before!.to).toBe(day(-7));
    expect(list.find((x) => x.name === "Future")!.status).toBe("planned");
    expect(await listCampaigns(b)).toHaveLength(0);
  });
});

describe("drop-off points", () => {
  it("containers placed per material with fill level; not a container at a customer; tenant-scoped", async () => {
    const p = await createDropOffPoint(a, { name: "PAV Place du marché (synthetic)", commune: "Bir El Djir", wilaya: "Oran", latitude: "35.7300", longitude: "-0.5600" });
    await expect(createDropOffPoint(a, { name: "PAV Place du marché (synthetic)", latitude: "35", longitude: "-0.5" })).rejects.toThrow("errors.territory.pointExists");
    const bin = await createContainer(a, { code: "PAV-PET-1", type: "BIN_1100L" });
    await expect(assignContainer(a, { containerId: bin.id, dropOffPointId: p.id })).rejects.toThrow("errors.validation"); // material required
    await assignContainer(a, { containerId: bin.id, dropOffPointId: p.id, stream: "PET" });
    await prisma.container.update({ where: { id: bin.id }, data: { lastFillPct: 92, lastFillAt: new Date() } });
    const atCustomer = await createContainer(a, { code: "SKP-T1", type: "SKIP_10M3" });
    const loc = await prisma.serviceLocation.findFirstOrThrow({ where: { organizationId: a.org.id } });
    await moveContainer(a, { containerId: atCustomer.id, action: "deliver", serviceLocationId: loc.id });
    await expect(assignContainer(a, { containerId: atCustomer.id, dropOffPointId: p.id, stream: "GLASS" })).rejects.toThrow("errors.territory.containerAtCustomer");
    await expect(assignContainer(b, { containerId: bin.id, dropOffPointId: p.id, stream: "PET" })).rejects.toThrow();
    const points = await listDropOffPoints(a);
    expect(points[0]).toMatchObject({ name: "PAV Place du marché (synthetic)", full: 1 });
    expect(points[0]!.containers[0]).toMatchObject({ code: "PAV-PET-1", stream: "PET", lastFillPct: 92 });
    expect(await listDropOffPoints(b)).toHaveLength(0);
    // The database refuses a container both at a customer and at a drop-off point.
    await expect(prisma.container.update({ where: { id: atCustomer.id }, data: { dropOffPointId: p.id } })).rejects.toThrow();
  });
});
