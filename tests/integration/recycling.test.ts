import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { addWeightTicket } from "@/server/services/work-orders";
import { classifyCategory, createDestination, listDestinations, recordRejects, recoveryCertificate, recoveryLedger, recoveryReport, setDestinationActive } from "@/server/services/recycling";
import type { OrgContext } from "@/server/context";

/** Recycling R1: destinations, stream per ticket, rejects, diversion rate, certificate — all tenant-scoped. */
let a: OrgContext;
let b: OrgContext;
let customerId: string;
let recycler: string, landfill: string, foreignDest: string;
const month = new Date().toISOString().slice(0, 7);
const today = new Date().toISOString().slice(0, 10);

const locations = new Map<string, string>();
async function workOrder(ctx: OrgContext, categoryCode: string, custId: string) {
  if (!locations.has(custId)) locations.set(custId, (await addServiceLocation(ctx, custId, { label: "Site", addressLine: "Rue test", wilaya: "Oran" })).id);
  const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: ctx.org.id, code: categoryCode } });
  const n = await prisma.workOrder.count({ where: { organizationId: ctx.org.id } });
  return prisma.workOrder.create({
    data: { organizationId: ctx.org.id, number: `WO-T${n + 1}`, kind: "COLLECTION", status: "IN_PROGRESS", customerId: custId, serviceLocationId: locations.get(custId)!, wasteCategoryId: cat.id, scheduledDate: new Date(`${today}T00:00:00Z`), createdById: ctx.userId },
  });
}

beforeAll(async () => {
  await resetDb();
  a = (await newOrg()).ctx;
  b = (await newOrg()).ctx;
  customerId = (await createCustomer(a, { name: "Supermarché Test" })).id;
  recycler = (await createDestination(a, { name: "Recycleur Carton Oran", kind: "RECYCLER", registrationNumber: "AGR-0001 (synthetic)" })).id;
  landfill = (await createDestination(a, { name: "CET Démo (synthetic)", kind: "LANDFILL" })).id;
  foreignDest = (await createDestination(b, { name: "Recycleur B", kind: "RECYCLER" })).id;
});

describe("destinations", () => {
  it("are tenant-scoped, unique by name, managed by admins only", async () => {
    expect((await listDestinations(a)).map((d) => d.name).sort()).toEqual(["CET Démo (synthetic)", "Recycleur Carton Oran"]);
    await expect(createDestination(a, { name: "Recycleur Carton Oran", kind: "RECYCLER" })).rejects.toThrow("errors.recycling.destinationExists");
    const driver = await addMember(a, "FIELD_WORKER");
    await expect(createDestination(driver, { name: "X", kind: "RECYCLER" })).rejects.toThrow();
    await expect(setDestinationActive(b, recycler, false)).rejects.toThrow(/not found|NotFound/i);
  });
});

describe("weight tickets with stream and destination", () => {
  it("takes the stream from the work order category, refuses another tenant's or an inactive destination", async () => {
    const wo = await workOrder(a, "CARDBOARD", customerId);
    const t = await addWeightTicket(a, wo.id, { grossKg: "1500", tareKg: "500", destinationId: recycler });
    expect([t.stream, t.destinationId, t.netKg.toString()]).toEqual(["PAPER_CARDBOARD", recycler, "1000"]);
    await expect(addWeightTicket(a, wo.id, { grossKg: "10", tareKg: "0", destinationId: foreignDest })).rejects.toThrow(/not found|NotFound/i);
    const tmp = await createDestination(a, { name: "Ancien recycleur", kind: "RECYCLER" });
    await setDestinationActive(a, tmp.id, false);
    await expect(addWeightTicket(a, wo.id, { grossKg: "10", tareKg: "0", destinationId: tmp.id })).rejects.toThrow(/not found|NotFound/i);
  });

  it("records processor rejects, never above the net weight, audited", async () => {
    const t = await prisma.weightTicket.findFirstOrThrow({ where: { organizationId: a.org.id, destinationId: recycler } });
    await expect(recordRejects(a, t.id, { rejectedKg: "5000" })).rejects.toThrow("errors.recycling.rejectAboveNet");
    await expect(recordRejects(b, t.id, { rejectedKg: "10" })).rejects.toThrow(/not found|NotFound/i);
    await recordRejects(a, t.id, { rejectedKg: "100" });
    expect(await prisma.auditEvent.count({ where: { action: "recycling.rejects_recorded" } })).toBe(1);
  });
});

describe("recovery report and certificate", () => {
  beforeAll(async () => {
    const msw = await workOrder(a, "MSW", customerId);
    await addWeightTicket(a, msw.id, { grossKg: "2000", tareKg: "0", destinationId: landfill }); // residual → disposal
    const pet = await workOrder(a, "PLASTIC", customerId);
    await addWeightTicket(a, pet.id, { grossKg: "500", tareKg: "0", destinationId: recycler, stream: "PET", contaminated: "on" }); // contaminated → disposal
    await addWeightTicket(a, pet.id, { grossKg: "300", tareKg: "0", stream: "PET" }); // no destination → untracked
  });

  it("computes recovered / disposed / untracked and the diversion rate from tickets only", async () => {
    const r = await recoveryReport(a, { from: today, to: today });
    // cardboard 1000 − 100 rejects = 900 recovered; disposal = 100 + 2000 + 500 = 2600; untracked 300
    expect(r.total).toEqual({ recovered: 90000, disposed: 260000, untracked: 30000, energy: 0 });
    expect(r.rate).toBeCloseTo(900 / 3800, 6);
    expect(r.byStream.find((s) => s.key === "PAPER_CARDBOARD")).toMatchObject({ recovered: 90000, disposed: 10000 });
    expect(r.tickets).toBe(4);
    expect((await recoveryLedger(a, { from: today, to: today })).length).toBe(4);
  });

  it("other tenants see nothing; field workers cannot read the report", async () => {
    expect((await recoveryReport(b, { from: today, to: today })).tickets).toBe(0);
    await expect(recoveryReport(await addMember(a, "FIELD_WORKER"), { from: today, to: today })).rejects.toThrow();
  });

  it("certificate: per customer and month, reference, portal sees only its own customer, other tenants 404", async () => {
    const c = await recoveryCertificate(a, customerId, month);
    expect(c.reference).toMatch(/^VAL-.+-\d{6}$/);
    expect(c.total.recovered).toBe(90000);
    expect(c.destinationsUsed.map((d) => d.name).sort()).toEqual(["CET Démo (synthetic)", "Recycleur Carton Oran"]);
    const own = await addMember(a, "CUSTOMER_PORTAL", customerId);
    await expect(recoveryCertificate(own, customerId, month)).resolves.toHaveProperty("reference");
    const other = await createCustomer(a, { name: "Autre" });
    await expect(recoveryCertificate(own, other.id, month)).rejects.toThrow();
    await expect(recoveryCertificate(b, customerId, month)).rejects.toThrow(/not found|NotFound/i);
  });
});

describe("category classification (décret 06-104)", () => {
  it("accepts a code only together with a class that has it; other tenants' categories are not found", async () => {
    const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: a.org.id, code: "CARDBOARD" } });
    await classifyCategory(a, cat.id, { stream: "PAPER_CARDBOARD", regulatoryClass: "HOUSEHOLD_SIMILAR", nomenclatureCode: "20.1.1" });
    expect((await prisma.wasteCategory.findUniqueOrThrow({ where: { id: cat.id } })).nomenclatureCode).toBe("20.1.1");
    // 20.1.21 exists only in annex III (S "Métaux"); "1.2" is not a rubric code.
    await expect(classifyCategory(a, cat.id, { stream: "FERROUS", regulatoryClass: "HOUSEHOLD_SIMILAR", nomenclatureCode: "20.1.21" })).rejects.toThrow("errors.recycling.codeUnknown");
    await expect(classifyCategory(a, cat.id, { stream: "", regulatoryClass: "SPECIAL", nomenclatureCode: "1.2" })).rejects.toThrow("errors.validation");
    await classifyCategory(a, cat.id, { stream: "FERROUS", regulatoryClass: "SPECIAL", nomenclatureCode: "20.1.21" });
    await classifyCategory(a, cat.id, { stream: "PAPER_CARDBOARD", regulatoryClass: "HOUSEHOLD_SIMILAR", nomenclatureCode: "" });
    expect((await prisma.wasteCategory.findUniqueOrThrow({ where: { id: cat.id } })).nomenclatureCode).toBeNull();
    await expect(classifyCategory(b, cat.id, { stream: "GLASS", regulatoryClass: "HOUSEHOLD_SIMILAR", nomenclatureCode: "" })).rejects.toThrow();
    expect((await prisma.wasteCategory.findUniqueOrThrow({ where: { id: cat.id } })).stream).toBe("PAPER_CARDBOARD");
    const field = await addMember(a, "FIELD_WORKER");
    await expect(classifyCategory(field, cat.id, { stream: "GLASS", regulatoryClass: "HOUSEHOLD_SIMILAR" })).rejects.toThrow();
  });
});

describe("law 25-02 alignment", () => {
  it("special waste only goes to a destination with a recorded approval/licence number (art. 15, 19)", async () => {
    const wo = await workOrder(a, "SPECIAL", customerId);
    await expect(addWeightTicket(a, wo.id, { grossKg: "1200", tareKg: "1000", destinationId: landfill })).rejects.toThrow("errors.recycling.specialNeedsLicence");
    await expect(addWeightTicket(a, wo.id, { grossKg: "1200", tareKg: "1000" })).rejects.toThrow("errors.recycling.specialNeedsLicence");
    await addWeightTicket(a, wo.id, { grossKg: "1200", tareKg: "1000", destinationId: recycler }); // has AGR-0001
    // A non-special category can still declare a SPECIAL stream on one ticket — same rule.
    const mixed = await workOrder(a, "MSW", customerId);
    await expect(addWeightTicket(a, mixed.id, { grossKg: "1100", tareKg: "1000", stream: "SPECIAL", destinationId: landfill })).rejects.toThrow("errors.recycling.specialNeedsLicence");
  });

  it("reports energy valorisation separately and flags organic waste outside biological treatment (art. 35 bis)", async () => {
    const energy = (await createDestination(a, { name: "Valorisation énergétique Démo (synthetic)", kind: "ENERGY_RECOVERY" })).id;
    const before = await recoveryReport(a, { from: today, to: today });
    const wo = await workOrder(a, "ORGANIC", customerId);
    await addWeightTicket(a, wo.id, { grossKg: "1300", tareKg: "1000", destinationId: landfill });
    const res = await workOrder(a, "MSW", customerId);
    await addWeightTicket(a, res.id, { grossKg: "1500", tareKg: "1000", destinationId: energy });
    const after = await recoveryReport(a, { from: today, to: today });
    expect(after.organicElsewhere - before.organicElsewhere).toBe(30000);
    expect(after.total.energy - before.total.energy).toBe(50000);
    expect(after.total.recovered - before.total.recovered).toBe(50000);
    // Other tenants see none of it.
    expect((await recoveryReport(b, { from: today, to: today })).total).toEqual({ recovered: 0, disposed: 0, untracked: 0, energy: 0 });
  });
});
