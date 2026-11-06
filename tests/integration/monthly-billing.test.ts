import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { createContract, setContractStatus } from "@/server/services/contracts";
import { voidInvoice } from "@/server/services/invoices";
import { monthlyBillingPreview, runMonthlyBilling } from "@/server/services/monthly-billing";
import type { OrgContext } from "@/server/context";

/** Month-end billing run (D-89): what goes in, what is left out and why, idempotence, void release, roles, tenants. */
let a: OrgContext, b: OrgContext, dispatcher: OrgContext;
let x: string, y: string, z: string;
let n = 0;

async function location(customerId: string, label: string) {
  return (await addServiceLocation(a, customerId, { label, addressLine: "Rue test", commune: "Oran", latitude: "35.70", longitude: "-0.64" })).id;
}

async function done(customerId: string, serviceLocationId: string, day: string, contract?: { id: string; lineId: string; categoryId: string }) {
  n++;
  return (await prisma.workOrder.create({
    data: {
      organizationId: a.org.id, number: `WO-M${n}`, kind: "COLLECTION", status: "COMPLETED", customerId, serviceLocationId,
      contractId: contract?.id, contractLineId: contract?.lineId, wasteCategoryId: contract?.categoryId,
      scheduledDate: new Date(`${day}T00:00:00Z`), createdById: a.userId,
    },
  })).id;
}

async function contractFor(customerId: string, lines: { loc: string; unit: "PER_COLLECTION" | "PER_TONNE" | "PER_MONTH"; price: string }[], start = "2026-09-01", end: string | null = "2027-08-31") {
  const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: a.org.id, code: "MSW" } });
  const c = await createContract(a, {
    customerId, title: "Contrat test", startDate: start, endDate: end ?? undefined,
    lines: lines.map((l) => ({ serviceLocationId: l.loc, wasteCategoryId: cat.id, frequency: "WEEKLY", weekdays: [1], billingUnit: l.unit, unitPrice: l.price })),
  });
  await setContractStatus(a, c.id, "ACTIVE");
  const ids = await prisma.contractServiceLine.findMany({ where: { contractId: c.id }, orderBy: { unitPrice: "asc" } });
  return { id: c.id, categoryId: cat.id, lines: ids };
}

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Mensuel A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Mensuel B")).ctx;
  dispatcher = await addMember(a, "DISPATCHER");
  x = (await createCustomer(a, { name: "Alpha Hôtel (synthetic)" })).id;
  y = (await createCustomer(a, { name: "Bêta Usine (synthetic)" })).id;
  z = (await createCustomer(a, { name: "Gamma Sans contrat (synthetic)" })).id;
  const [x1, x2, y1, z1] = [await location(x, "Cuisine"), await location(x, "Parking"), await location(y, "Atelier"), await location(z, "Entrepôt")];
  const cx = await contractFor(x, [{ loc: x1, unit: "PER_COLLECTION", price: "2000.00" }, { loc: x2, unit: "PER_MONTH", price: "15000.00" }]);
  const perJob = cx.lines.find((l) => l.billingUnit === "PER_COLLECTION")!;
  const perMonth = cx.lines.find((l) => l.billingUnit === "PER_MONTH")!;
  await done(x, x1, "2026-10-14", { id: cx.id, lineId: perJob.id, categoryId: cx.categoryId });
  await done(x, x1, "2026-09-28", { id: cx.id, lineId: perJob.id, categoryId: cx.categoryId }); // late from last month: included
  await done(x, x1, "2026-11-03", { id: cx.id, lineId: perJob.id, categoryId: cx.categoryId }); // next month: not yet
  await done(x, x2, "2026-10-20", { id: cx.id, lineId: perMonth.id, categoryId: cx.categoryId }); // covered by the flat fee
  // A flat fee of a contract that ended before October is not billed.
  const old = await contractFor(x, [{ loc: x2, unit: "PER_MONTH", price: "99999.00" }], "2026-01-01", "2026-08-31");
  await setContractStatus(a, old.id, "EXPIRED").catch(() => prisma.contract.update({ where: { id: old.id }, data: { status: "EXPIRED" } }));
  const cy = await contractFor(y, [{ loc: y1, unit: "PER_TONNE", price: "4500.00" }]);
  await done(y, y1, "2026-10-10", { id: cy.id, lineId: cy.lines[0]!.id, categoryId: cy.categoryId }); // no weight ticket
  await done(z, z1, "2026-10-11"); // no contract
});

describe("monthly billing run", () => {
  it("preview: collections up to month end plus the month's fee; unpriceable jobs listed with the reason", async () => {
    const p = await monthlyBillingPreview(a, "2026-10");
    const byName = Object.fromEntries(p.customers.map((c) => [c.name, c]));
    const ax = byName["Alpha Hôtel (synthetic)"]!;
    expect([ax.collections, ax.flatFees, ax.problems]).toEqual([2, 1, []]);
    expect(ax.subtotalMinor).toBe((2000 * 2 + 15000) * 100);
    expect(byName["Bêta Usine (synthetic)"]!.problems).toEqual([{ number: expect.stringMatching(/^WO-M/), error: "errors.invoice.weightRequired" }]);
    expect(byName["Gamma Sans contrat (synthetic)"]!.problems.map((q) => q.error)).toEqual(["errors.invoice.noContractPrice"]);
    expect(p.invoiceCount).toBe(1);
  });

  it("run: one draft per customer with lines; a second run bills nothing more", async () => {
    const r = await runMonthlyBilling(a, { month: "2026-10" });
    expect(r.created).toHaveLength(1);
    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: r.created[0]!.invoiceId }, include: { lines: true } });
    expect([inv.status, inv.customerId, Number(inv.subtotal), inv.lines.length]).toEqual(["DRAFT", x, 19000, 3]);
    expect(inv.lines.filter((l) => l.periodMonth === "2026-10" && l.contractLineId)).toHaveLength(1);
    expect((await runMonthlyBilling(a, { month: "2026-10" })).created).toEqual([]);
    expect((await monthlyBillingPreview(a, "2026-10")).customers.some((c) => c.customerId === x)).toBe(false);
  });

  it("next month: the new fee and the new collection; voiding October puts October back", async () => {
    const nov = (await monthlyBillingPreview(a, "2026-11")).customers.find((c) => c.customerId === x)!;
    expect([nov.collections, nov.flatFees]).toEqual([1, 1]);
    const oct = await prisma.invoice.findFirstOrThrow({ where: { organizationId: a.org.id, customerId: x, notes: "Facturation mensuelle 2026-10" } });
    await voidInvoice(a, oct.id, { reason: "Erreur de prix (test)" });
    const again = (await monthlyBillingPreview(a, "2026-10")).customers.find((c) => c.customerId === x)!;
    expect([again.collections, again.flatFees]).toEqual([2, 1]);
  });

  it("unticked customers are left for later; only finance roles may run it", async () => {
    expect((await runMonthlyBilling(a, { month: "2026-10", customerIds: [y] })).created).toEqual([]);
    await expect(monthlyBillingPreview(dispatcher, "2026-10")).rejects.toThrow("errors.forbidden");
    await expect(runMonthlyBilling(dispatcher, { month: "2026-10" })).rejects.toThrow("errors.forbidden");
    await expect(monthlyBillingPreview(a, "2026-13")).rejects.toThrow("errors.validation");
  });

  it("cross-tenant: another organization sees and bills nothing of this one", async () => {
    expect((await monthlyBillingPreview(b, "2026-10")).customers).toEqual([]);
    expect((await runMonthlyBilling(b, { month: "2026-10", customerIds: [x] })).created).toEqual([]);
    expect(await prisma.invoice.count({ where: { organizationId: b.org.id } })).toBe(0);
  });
});
