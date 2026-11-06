import { beforeAll, describe, expect, it } from "vitest";
import { addMember, isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import {
  adjustStock, createItem, createPurchase, createSupplier, getItem, getPurchase, issueStock, listItems, markPurchasePaid,
  openingStock, stockReport, updateItem, vehicleConsumption, voidPurchase,
} from "@/server/services/stock";
import type { OrgContext } from "@/server/context";

/** Stock & procurement (STOCK.md): weighted average cost, no negative stock, receipts, voids, per-vehicle consumption. */
let a: OrgContext, b: OrgContext, dispatcher: OrgContext, finance: OrgContext, driver: OrgContext, viewer: OrgContext;
let oil: string, gloves: string, supplier: string, truck1: string, truck2: string;

const qty = async (ctx: OrgContext, id: string) => (await getItem(ctx, id)).qtyMilli / 1000;
const value = async (ctx: OrgContext, id: string) => (await getItem(ctx, id)).valueMinor;

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Stock A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Stock B")).ctx;
  dispatcher = await addMember(a, "DISPATCHER");
  finance = await addMember(a, "FINANCE");
  driver = await addMember(a, "FIELD_WORKER");
  viewer = await addMember(a, "VIEWER");
  oil = (await createItem(a, { code: "huile-15w40", name: "Huile moteur 15W40", category: "LUBRICANT", unit: "LITRE", reorderLevel: "40" })).id;
  gloves = (await createItem(a, { code: "GANTS-NIT", name: "Gants nitrile", category: "PPE", unit: "PAIR", reorderLevel: "" })).id;
  supplier = (await createSupplier(a, { name: "Pièces Auto Démo (fictif)", taxId: "000000000000000" })).id;
  truck1 = (await prisma.vehicle.create({ data: { organizationId: a.org.id, plateNumber: "00001-116-31", label: "Benne 1", type: "COMPACTOR" } })).id;
  truck2 = (await prisma.vehicle.create({ data: { organizationId: a.org.id, plateNumber: "00002-116-31", label: "Benne 2", type: "COMPACTOR" } })).id;
});

describe("items", () => {
  it("codes are unique per organization (case-insensitive) but free across organizations", async () => {
    await expect(createItem(a, { code: "HUILE-15W40", name: "x", category: "LUBRICANT", unit: "LITRE" })).rejects.toThrow("errors.stock.codeTaken");
    await expect(createItem(b, { code: "HUILE-15W40", name: "x", category: "LUBRICANT", unit: "LITRE" })).resolves.toBeTruthy();
  });
});

describe("weighted average cost", () => {
  it("averages receipts, issues at the average, and empties without leftover value", async () => {
    await createPurchase(a, { supplierId: supplier, supplierInvoiceRef: "FA-1", receivedOn: isoDay(-3), vat: "3420", lines: [{ itemId: oil, quantity: "100", unitCost: "180" }] });
    await createPurchase(a, { supplierId: supplier, receivedOn: isoDay(-2), lines: [{ itemId: oil, quantity: "50", unitCost: "210" }, { itemId: "", quantity: "", unitCost: "" }] });
    const it1 = await getItem(a, oil);
    expect([it1.qtyMilli, it1.valueMinor, it1.avgCostMinor]).toEqual([150_000, 2_850_000, 19_000]); // 190.00 DZD/L
    await issueStock(a, { itemId: oil, quantity: "4", vehicleId: truck1, reason: "Vidange" });
    expect(await value(a, oil)).toBe(2_850_000 - 76_000); // 4 L × 190.00
    await issueStock(dispatcher, { itemId: oil, quantity: "146", vehicleId: truck2 });
    expect([await qty(a, oil), await value(a, oil)]).toEqual([0, 0]);
  });

  it("refuses to go below zero, and keeps the reorder alert", async () => {
    await expect(issueStock(a, { itemId: oil, quantity: "0.5" })).rejects.toThrow("errors.stock.insufficient");
    expect((await listItems(a, { low: true })).map((r) => r.id)).toContain(oil);
  });

  it("concurrent issues never oversell: 10 × 3 pairs from 20 → exactly 6 succeed", async () => {
    await openingStock(a, { itemId: gloves, quantity: "20", unitCost: "45" });
    await expect(openingStock(a, { itemId: gloves, quantity: "1", unitCost: "1" })).rejects.toThrow("errors.stock.openingExists");
    const r = await Promise.allSettled(Array.from({ length: 10 }, () => issueStock(a, { itemId: gloves, quantity: "3" })));
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(6);
    expect(await qty(a, gloves)).toBe(2);
    expect(await value(a, gloves)).toBe(9_000); // 2 × 45.00 left
  });

  it("adjustments: out at the average, in at the average or at a given cost, always with a reason", async () => {
    await expect(adjustStock(a, { itemId: gloves, quantity: "-1", reason: "" })).rejects.toThrow("errors.validation");
    await adjustStock(a, { itemId: gloves, quantity: "-1", reason: "Inventaire: une paire déchirée" });
    expect(await value(a, gloves)).toBe(4_500);
    await adjustStock(a, { itemId: gloves, quantity: "2", reason: "Inventaire: trouvé en réserve" });
    expect([await qty(a, gloves), await value(a, gloves)]).toEqual([3, 13_500]);
    await expect(adjustStock(a, { itemId: oil, quantity: "1", reason: "trouvé" })).rejects.toThrow("errors.stock.unitCostRequired"); // empty: no average
    await adjustStock(a, { itemId: oil, quantity: "1", reason: "trouvé", unitCost: "200" });
    expect(await value(a, oil)).toBe(20_000);
  });
});

describe("purchases", () => {
  it("validates lines, refuses future dates and unknown items", async () => {
    await expect(createPurchase(a, { supplierId: supplier, lines: [{ itemId: oil, quantity: "1", unitCost: "" }] })).rejects.toThrow("errors.validation");
    await expect(createPurchase(a, { supplierId: supplier, lines: [] })).rejects.toThrow("errors.validation");
    await expect(createPurchase(a, { supplierId: supplier, receivedOn: isoDay(5), lines: [{ itemId: oil, quantity: "1", unitCost: "1" }] })).rejects.toThrow("errors.stock.futureDate");
    const foreign = (await listItems(b))[0]!.id;
    await expect(createPurchase(a, { supplierId: supplier, lines: [{ itemId: foreign, quantity: "1", unitCost: "1" }] })).rejects.toThrow(/notFound/);
  });

  it("void reverses an unused receipt; refused once the goods were used", async () => {
    const p = await createPurchase(a, { supplierId: supplier, lines: [{ itemId: gloves, quantity: "10", unitCost: "50" }] });
    const before = await qty(a, gloves);
    await voidPurchase(a, p.id, { reason: "Saisie en double" });
    expect(await qty(a, gloves)).toBe(before - 10);
    await expect(voidPurchase(a, p.id, { reason: "again" })).rejects.toThrow("errors.invalidTransition");
    const p2 = await createPurchase(a, { supplierId: supplier, lines: [{ itemId: gloves, quantity: "5", unitCost: "50" }] });
    await issueStock(a, { itemId: gloves, quantity: String((await qty(a, gloves)) - 2) });
    await expect(voidPurchase(a, p2.id, { reason: "x" })).rejects.toThrow("errors.stock.alreadyUsed");
  });

  it("paid once, by finance; void purchases cannot be paid", async () => {
    const p = await createPurchase(finance, { supplierId: supplier, lines: [{ itemId: oil, quantity: "20", unitCost: "185" }] });
    expect((await getPurchase(a, p.id)).totalMinor).toBe(370_000n);
    await markPurchasePaid(finance, p.id);
    await expect(markPurchasePaid(finance, p.id)).rejects.toThrow("errors.invalidTransition");
    await expect(markPurchasePaid(driver, p.id)).rejects.toThrow("errors.forbidden");
  });
});

describe("reports", () => {
  it("consumption per vehicle and per category over the period", async () => {
    const r = await stockReport(a, { from: isoDay(-10), to: isoDay(0) });
    const t1 = r.byVehicle.find((x) => x.vehicle?.id === truck1)!;
    const t2 = r.byVehicle.find((x) => x.vehicle?.id === truck2)!;
    expect([t1.valueMinor, t2.valueMinor]).toEqual([76_000, 2_774_000]);
    expect(r.byCategory.find((x) => x.category === "LUBRICANT")!.valueMinor).toBe(2_850_000);
    expect(r.unpaid.count).toBeGreaterThan(0);
    const c = await vehicleConsumption(a, truck1, isoDay(-10), isoDay(0));
    expect([c.rows.length, c.totalMinor]).toEqual([1, 76_000]);
  });
});

describe("permissions and tenant isolation", () => {
  it("drivers see nothing; viewers read only; finance buys but does not move stock", async () => {
    await expect(listItems(driver)).rejects.toThrow("errors.forbidden");
    await expect(listItems(viewer)).resolves.toBeTruthy();
    await expect(issueStock(viewer, { itemId: gloves, quantity: "1" })).rejects.toThrow("errors.forbidden");
    await expect(issueStock(finance, { itemId: gloves, quantity: "1" })).rejects.toThrow("errors.forbidden");
    await expect(updateItem(viewer, oil, { name: "x", reorderLevel: "1", active: "on" })).rejects.toThrow("errors.forbidden");
  });

  it("cross-tenant: another organization can neither read nor move this stock, nor issue to its vehicles", async () => {
    await expect(getItem(b, oil)).rejects.toThrow(/notFound/);
    await expect(issueStock(b, { itemId: oil, quantity: "1" })).rejects.toThrow(/notFound/);
    await expect(createPurchase(b, { supplierId: supplier, lines: [{ itemId: oil, quantity: "1", unitCost: "1" }] })).rejects.toThrow(/notFound/);
    const bItem = (await createItem(b, { code: "B-1", name: "b", category: "OTHER", unit: "UNIT" })).id;
    await openingStock(b, { itemId: bItem, quantity: "5", unitCost: "1" });
    await expect(issueStock(b, { itemId: bItem, quantity: "1", vehicleId: truck1 })).rejects.toThrow(/notFound/);
    expect((await listItems(b)).map((r) => r.id)).not.toContain(oil);
    expect((await stockReport(b, { from: isoDay(-10), to: isoDay(0) })).consumedMinor).toBe(0);
  });

  it("the ledger is append-only in the database", async () => {
    const m = await prisma.stockMovement.findFirstOrThrow({ where: { organizationId: a.org.id } });
    await expect(prisma.stockMovement.update({ where: { id: m.id }, data: { reason: "edited" } })).rejects.toThrow(/append-only/);
    await expect(prisma.stockMovement.delete({ where: { id: m.id } })).rejects.toThrow(/append-only/);
  });

  it("every write is audited", async () => {
    const actions = (await prisma.auditEvent.findMany({ where: { organizationId: a.org.id, action: { startsWith: "stock." } }, select: { action: true } })).map((x) => x.action);
    for (const x of ["stock.item_created", "stock.purchase_received", "stock.issued", "stock.opening", "stock.adjusted", "stock.purchase_voided", "stock.purchase_paid", "stock.supplier_created"]) expect(actions).toContain(x);
  });
});
