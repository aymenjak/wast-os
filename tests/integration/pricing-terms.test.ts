import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { addSurcharge, createContract, getContract, removeSurcharge, setContractStatus, setLinePricing } from "@/server/services/contracts";
import { createDraftInvoice } from "@/server/services/invoices";
import { monthlyBillingPreview } from "@/server/services/monthly-billing";
import type { OrgContext } from "@/server/context";

/** Contract pricing terms (D-90): tonnage tiers, minimum charge, surcharges on drafts and on the monthly run. */
let a: OrgContext, b: OrgContext, finance: OrgContext;
let customerId: string, contractId: string, tonneLine: string, jobLine: string, loc1: string, loc2: string, categoryId: string;
let n = 0;

async function weighed(kg: number | null, line: string, loc: string, day?: string) {
  n++;
  day ??= `2026-10-${String(10 + n).padStart(2, "0")}`;
  const wo = await prisma.workOrder.create({
    data: {
      organizationId: a.org.id, number: `WO-P${n}`, kind: "COLLECTION", status: "COMPLETED", customerId, serviceLocationId: loc,
      contractId, contractLineId: line, wasteCategoryId: categoryId, scheduledDate: new Date(`${day}T00:00:00Z`), createdById: a.userId,
    },
  });
  if (kg != null) {
    await prisma.weightTicket.create({ data: { organizationId: a.org.id, workOrderId: wo.id, grossKg: String(kg + 1000), tareKg: "1000", netKg: String(kg), weighedAt: new Date(`${day}T10:00:00Z`), recordedById: a.userId } });
  }
  return wo.id;
}

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Tarifs A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Tarifs B")).ctx;
  finance = await addMember(a, "FINANCE");
  customerId = (await createCustomer(a, { name: "Usine Tarifée (synthetic)" })).id;
  loc1 = (await addServiceLocation(a, customerId, { label: "Quai", addressLine: "Zone industrielle", commune: "Arzew", latitude: "35.85", longitude: "-0.31" })).id;
  loc2 = (await addServiceLocation(a, customerId, { label: "Bureaux", addressLine: "Zone industrielle", commune: "Arzew", latitude: "35.85", longitude: "-0.30" })).id;
  categoryId = (await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: a.org.id, code: "MSW" } })).id;
  const c = await createContract(a, {
    customerId, title: "Tarifs dégressifs", startDate: "2026-09-01",
    lines: [
      { serviceLocationId: loc1, wasteCategoryId: categoryId, frequency: "WEEKLY", weekdays: [1], billingUnit: "PER_TONNE", unitPrice: "4500.00" },
      { serviceLocationId: loc2, wasteCategoryId: categoryId, frequency: "WEEKLY", weekdays: [2], billingUnit: "PER_COLLECTION", unitPrice: "1000.00" },
    ],
  });
  contractId = c.id;
  await setContractStatus(a, contractId, "ACTIVE");
  const lines = await prisma.contractServiceLine.findMany({ where: { contractId } });
  tonneLine = lines.find((l) => l.billingUnit === "PER_TONNE")!.id;
  jobLine = lines.find((l) => l.billingUnit === "PER_COLLECTION")!.id;
});

describe("contract pricing terms", () => {
  it("graduated tiers price one collection, with the breakdown on the invoice line", async () => {
    await setLinePricing(a, tonneLine, { tiers: [{ aboveTonnes: "2", unitPrice: "4000" }, { aboveTonnes: "5", unitPrice: "3500" }, { aboveTonnes: "", unitPrice: "" }] });
    const wo = await weighed(6500, tonneLine, loc1);
    const inv = await createDraftInvoice(a, { customerId, workOrderIds: [wo] });
    const [line] = await prisma.invoiceLine.findMany({ where: { invoiceId: inv.id } });
    expect([Number(line!.quantity), Number(line!.lineSubtotal)]).toEqual([1, 26250]); // 2 t × 4 500 + 3 t × 4 000 + 1.5 t × 3 500
    expect(line!.description).toContain("6.500 t : 2.000 t × 4500.00 + 3.000 t × 4000.00 + 1.500 t × 3500.00");
  });

  it("the minimum charge applies to a small load", async () => {
    await setLinePricing(a, tonneLine, { minimumCharge: "3000", tiers: [] });
    const wo = await weighed(200, tonneLine, loc1); // 0.2 t × 4 500 = 900 < 3 000
    const inv = await createDraftInvoice(a, { customerId, workOrderIds: [wo] });
    const [line] = await prisma.invoiceLine.findMany({ where: { invoiceId: inv.id } });
    expect(Number(line!.lineSubtotal)).toBe(3000);
    expect(line!.description).toContain("minimum 3000.00");
  });

  it("surcharges: percent of the contract's lines and a fixed amount per collection, each on its own line", async () => {
    await setLinePricing(a, tonneLine, {}); // back to the plain per-tonne price
    const fuel = await addSurcharge(a, contractId, { label: "Surcharge carburant", kind: "PERCENT", value: "5" });
    await addSurcharge(a, contractId, { label: "Accès site", kind: "PER_COLLECTION", value: "250" });
    const w1 = await weighed(2000, tonneLine, loc1); // 2 t × 4 500 = 9 000
    const w2 = await weighed(null, jobLine, loc2); // 1 000
    const inv = await createDraftInvoice(a, { customerId, workOrderIds: [w1, w2] });
    const lines = await prisma.invoiceLine.findMany({ where: { invoiceId: inv.id }, orderBy: { position: "asc" } });
    expect(lines.map((l) => [l.workOrderId ? "job" : l.description.split(" ")[0], Number(l.quantity), Number(l.lineSubtotal)])).toEqual([
      ["job", 2, 9000], ["job", 1, 1000], ["Surcharge", 1, 500], ["Accès", 2, 500],
    ]);
    expect(Number((await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id } })).subtotal)).toBe(11000);
    // Switched off: no longer applied, still listed nowhere on the contract page.
    await removeSurcharge(a, fuel.id);
    expect((await getContract(a, contractId)).surcharges.map((s) => s.label)).toEqual(["Accès site"]);
  });

  it("the monthly run adds the surcharges too", async () => {
    await weighed(1000, tonneLine, loc1, "2026-11-05"); // 4 500
    const c = (await monthlyBillingPreview(a, "2026-11")).customers.find((x) => x.customerId === customerId)!;
    expect([c.collections, c.surcharges, c.subtotalMinor]).toEqual([1, 1, (4500 + 250) * 100]);
  });

  it("validation and roles: tiers in order, complete rows, per-tonne lines only, owners only", async () => {
    await expect(setLinePricing(a, tonneLine, { tiers: [{ aboveTonnes: "5", unitPrice: "1" }, { aboveTonnes: "2", unitPrice: "1" }] })).rejects.toThrow("errors.validation");
    await expect(setLinePricing(a, tonneLine, { tiers: [{ aboveTonnes: "5", unitPrice: "" }] })).rejects.toThrow("errors.validation");
    await expect(setLinePricing(a, jobLine, { minimumCharge: "100" })).rejects.toThrow("errors.contract.tiersPerTonneOnly");
    await expect(addSurcharge(a, contractId, { label: "Trop", kind: "PERCENT", value: "150" })).rejects.toThrow("errors.validation");
    await expect(setLinePricing(finance, tonneLine, { minimumCharge: "1" })).rejects.toThrow("errors.forbidden");
    await expect(addSurcharge(finance, contractId, { label: "X", kind: "PER_COLLECTION", value: "1" })).rejects.toThrow("errors.forbidden");
  });

  it("cross-tenant: another organization can neither change these terms nor see them", async () => {
    await expect(setLinePricing(b, tonneLine, { minimumCharge: "1" })).rejects.toThrow(/notFound/);
    await expect(addSurcharge(b, contractId, { label: "Intrus", kind: "PER_COLLECTION", value: "1" })).rejects.toThrow(/notFound/);
    const sc = await prisma.contractSurcharge.findFirstOrThrow({ where: { organizationId: a.org.id, active: true } });
    await expect(removeSurcharge(b, sc.id)).rejects.toThrow(/notFound/);
    expect((await prisma.contractServiceLine.findUniqueOrThrow({ where: { id: tonneLine } })).minimumCharge).toBeNull();
  });
});
