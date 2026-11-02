import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { addWeightTicket } from "@/server/services/work-orders";
import { createDestination } from "@/server/services/recycling";
import {
  addAdjustment, cancelSale, createBale, createPurchase, createSale, createSupplier, deliverSale, getSale, listYards, markPurchasePaid,
  recordClaim, settleSale, voidBale, voidPurchase, yardReport, yardStock,
} from "@/server/services/yard";
import type { OrgContext } from "@/server/context";

/** R2 sorting yard: stock never negative, purchases at operator prices, bales, sales, claims, mass balance — tenant-scoped. */
let a: OrgContext;
let b: OrgContext;
let yard: string, buyer: string, supplier: string;
const today = new Date().toISOString().slice(0, 10);
const stockOf = async (stream: string) => (await yardStock(a, yard)).rows.find((r) => r.stream === stream)?.bulkKg ?? 0;

beforeAll(async () => {
  await resetDb();
  a = (await newOrg()).ctx;
  b = (await newOrg()).ctx;
  yard = (await createDestination(a, { name: "Centre de tri maison (synthetic)", kind: "SORTING_CENTRE", ownYard: "on" })).id;
  buyer = (await createDestination(a, { name: "Papeterie acheteuse (synthetic)", kind: "RECYCLER", registrationNumber: "AGR-PAP-1 (synthetic)" })).id;
  supplier = (await createSupplier(a, { name: "Collecteur Démo (synthetic)", kind: "INDIVIDUAL", phone: "0550000000", registrationNumber: "should be dropped" })).id;
});

describe("yard setup", () => {
  it("only a sorting centre can be the own yard; suppliers keep minimal personal data", async () => {
    await expect(createDestination(a, { name: "Pas un centre", kind: "RECYCLER", ownYard: "on" })).rejects.toThrow("errors.validation");
    expect((await listYards(a)).map((y) => y.id)).toEqual([yard]);
    expect(await listYards(b)).toHaveLength(0);
    expect((await prisma.materialSupplier.findUniqueOrThrow({ where: { id: supplier } })).registrationNumber).toBeNull();
  });
});

describe("stock", () => {
  it("own collections delivered to the yard and purchases enter bulk stock; operator prices; voiding blocked once used", async () => {
    // Own collection: a cardboard ticket delivered to the yard with 20 kg rejected at reception.
    const cust = (await createCustomer(a, { name: "Client (synthetic)" })).id;
    const loc = await addServiceLocation(a, cust, { label: "Site", addressLine: "Rue test", wilaya: "Oran" });
    const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: a.org.id, code: "CARDBOARD" } });
    const wo = await prisma.workOrder.create({ data: { organizationId: a.org.id, number: "WO-Y1", kind: "COLLECTION", status: "IN_PROGRESS", customerId: cust, serviceLocationId: loc.id, wasteCategoryId: cat.id, scheduledDate: new Date(), createdById: a.userId } });
    const t = await addWeightTicket(a, wo.id, { grossKg: "10500", tareKg: "10000", destinationId: yard });
    await prisma.weightTicket.update({ where: { id: t.id }, data: { rejectedKg: "20" } });
    expect(await stockOf("PAPER_CARDBOARD")).toBe(480);

    await expect(createPurchase(a, { yardId: yard, supplierId: supplier, lines: [{ stream: "PET", grossKg: "100", tareKg: "100", unitPrice: "30" }] })).rejects.toThrow("errors.yard.tareAboveGross");
    const p = await createPurchase(a, { yardId: yard, supplierId: supplier, lines: [
      { stream: "PET", grade: "Clair", grossKg: "120.5", tareKg: "20.5", unitPrice: "30" },
      { stream: "PAPER_CARDBOARD", grossKg: "", tareKg: "", unitPrice: "" }, // empty row ignored
    ] });
    expect(p.number).toBe("ACH-00001");
    expect(p.totalMinor).toBe(300000n); // 100 kg × 30.00 DZD
    expect(await stockOf("PET")).toBe(100);
    const field = await addMember(a, "FIELD_WORKER");
    await expect(createPurchase(field, { yardId: yard, supplierId: supplier, lines: [{ stream: "PET", grossKg: "10", unitPrice: "1" }] })).rejects.toThrow();
    await expect(createPurchase(b, { yardId: yard, supplierId: supplier, lines: [{ stream: "PET", grossKg: "10", unitPrice: "1" }] })).rejects.toThrow();
    await markPurchasePaid(a, p.id);
    await expect(markPurchasePaid(a, p.id)).rejects.toThrow("errors.invalidTransition");

    await createBale(a, { yardId: yard, stream: "PET", weightKg: "60" });
    await expect(voidPurchase(a, p.id, { voidReason: "Erreur de saisie" })).rejects.toThrow("errors.yard.insufficientStock");
  });

  it("bales and rejects can never take bulk stock below zero; voided bale returns its weight", async () => {
    await expect(createBale(a, { yardId: yard, stream: "PET", weightKg: "41" })).rejects.toThrow("errors.yard.insufficientStock");
    await expect(addAdjustment(a, { yardId: yard, stream: "PET", kind: "REJECT", kg: "41", reason: "Refus de tri" })).rejects.toThrow("errors.yard.insufficientStock");
    await addAdjustment(a, { yardId: yard, stream: "PET", kind: "REJECT", kg: "10", reason: "Étiquettes et bouchons" });
    await expect(addAdjustment(a, { yardId: yard, stream: "PET", kind: "REJECT", kg: "-5", reason: "x" })).rejects.toThrow("errors.validation");
    expect(await stockOf("PET")).toBe(30);
    const big = await createBale(a, { yardId: yard, stream: "PAPER_CARDBOARD", weightKg: "400" });
    expect(big.number).toBe("BAL-00002");
    await voidBale(a, big.id);
    expect(await stockOf("PAPER_CARDBOARD")).toBe(480);
    await expect(createBale(b, { yardId: yard, stream: "PET", weightKg: "1" })).rejects.toThrow();
  });

  it("concurrent bales on the same stock cannot both succeed", async () => {
    await addAdjustment(a, { yardId: yard, stream: "ALUMINIUM", kind: "OPENING", kg: "100", reason: "Stock d'ouverture" });
    const r = await Promise.allSettled([1, 2, 3].map(() => createBale(a, { yardId: yard, stream: "ALUMINIUM", weightKg: "60" })));
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await stockOf("ALUMINIUM")).toBe(40);
  });
});

describe("sales", () => {
  it("bales and loose material to a buyer, prices required, claim, settlement, cancel returns bales", async () => {
    const bale = (await yardStock(a, yard)).bales.find((x) => x.stream === "PET")!;
    await expect(createSale(a, { yardId: yard, buyerId: buyer, baleIds: [bale.id], loose: [] })).rejects.toThrow("errors.yard.priceMissing");
    await expect(createSale(a, { yardId: yard, buyerId: yard, baleIds: [bale.id], prices: { PET: "55" } })).rejects.toThrow(); // own yard is not a buyer
    await expect(createSale(a, { yardId: yard, buyerId: buyer, loose: [{ stream: "PAPER_CARDBOARD", weightKg: "481" }], prices: { PAPER_CARDBOARD: "12" } })).rejects.toThrow("errors.yard.insufficientStock");

    const sale = await createSale(a, { yardId: yard, buyerId: buyer, baleIds: [bale.id], loose: [{ stream: "PAPER_CARDBOARD", weightKg: "300" }], prices: { PET: "55", PAPER_CARDBOARD: "12.5" } });
    expect(sale.number).toBe("VTE-00001");
    expect(sale.totalMinor).toBe(330000n + 375000n); // 60 × 55 + 300 × 12.50
    await expect(createSale(a, { yardId: yard, buyerId: buyer, baleIds: [bale.id], prices: { PET: "55" } })).rejects.toThrow("errors.yard.baleUnavailable");
    expect(await stockOf("PAPER_CARDBOARD")).toBe(180);

    await expect(recordClaim(a, sale.id, { claimKg: "5", claimReason: "Humidité" })).rejects.toThrow("errors.invalidTransition");
    await deliverSale(a, sale.id, { buyerWeighedKg: "355" });
    await expect(recordClaim(a, sale.id, { claimAmount: "99999", claimReason: "x" })).rejects.toThrow("errors.yard.claimAboveTotal");
    await recordClaim(a, sale.id, { claimKg: "5", claimAmount: "62.50", claimReason: "Humidité du carton" });
    await settleSale(a, sale.id);
    const s = (await getSale(a, sale.id))!;
    expect(s.status).toBe("SETTLED");
    expect(s.bales).toHaveLength(1);
    expect(await getSale(b, sale.id)).toBeNull();

    // Cancel a draft: bale back to stock.
    const al = (await yardStock(a, yard)).bales.find((x) => x.stream === "ALUMINIUM")!;
    const draft = await createSale(a, { yardId: yard, buyerId: buyer, baleIds: [al.id], prices: { ALUMINIUM: "150" } });
    await cancelSale(a, draft.id);
    expect((await yardStock(a, yard)).bales.some((x) => x.id === al.id)).toBe(true);
  });
});

describe("report", () => {
  it("mass balance per stream and margin estimated with the weighted average inbound cost", async () => {
    const r = await yardReport(a, yard, { from: today, to: today });
    const pet = r.rows.find((x) => x.stream === "PET")!;
    expect(pet).toMatchObject({ purchasedKg: 100, collectedKg: 0, baledKg: 60, rejectKg: 10, soldKg: 60, purchaseCost: 3000 });
    // The 62.50 claim is spread over all lines of the sale by amount: PET share = 62.50 × 3300/7050 ≈ 29.26.
    expect(pet.revenue).toBeCloseTo(3300 - 29.26, 2);
    expect(pet.estimatedCost).toBe(1800); // 60 kg × 30.00 average
    expect(pet.estimatedMargin).toBeCloseTo(3270.74 - 1800, 2);
    const paper = r.rows.find((x) => x.stream === "PAPER_CARDBOARD")!;
    // Own collection only (cost 0); paper share of the claim = 62.50 × 3750/7050 ≈ 33.24.
    expect(paper).toMatchObject({ collectedKg: 480, purchasedKg: 0, soldKg: 300, estimatedCost: 0 });
    expect(paper.revenue).toBeCloseTo(3750 - 33.24, 2);
    await expect(yardReport(await addMember(a, "FIELD_WORKER"), yard, { from: today, to: today })).rejects.toThrow();
    await expect(yardReport(b, yard, { from: today, to: today })).rejects.toThrow();
  });
});
