import { beforeAll, describe, expect, it } from "vitest";
import { addMember, isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createCustomer, addServiceLocation } from "@/server/services/customers";
import { createContract, setContractStatus } from "@/server/services/contracts";
import { generateRecurringWorkOrders } from "@/server/services/schedules";
import { createContainer, getContainer, listContainers, moveContainer } from "@/server/services/containers";
import { globalSearch } from "@/server/services/search";
import { dailyTrend } from "@/server/services/reports";
import { createTeam, addTeamMember } from "@/server/services/fleet";
import { assignWorkOrder, transitionWorkOrder } from "@/server/services/work-orders";
import { createDraftInvoice, getInvoice } from "@/server/services/invoices";
import type { OrgContext } from "@/server/context";

let a: OrgContext, b: OrgContext, worker: OrgContext;
let locationId: string, customerId: string;

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Ops A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Ops B")).ctx;
  worker = await addMember(a, "FIELD_WORKER");
  const c = await createCustomer(a, { name: "Factory (synthetic)" });
  customerId = c.id;
  locationId = (await addServiceLocation(a, c.id, { label: "Gate 2", addressLine: "ZI" })).id;
  const msw = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: a.org.id, code: "MSW" } });
  const k = await createContract(a, {
    customerId: c.id, title: "Mon/Thu collection", startDate: isoDay(-30),
    lines: [{ serviceLocationId: locationId, wasteCategoryId: msw.id, frequency: "WEEKLY", weekdays: [1, 4], billingUnit: "PER_COLLECTION", unitPrice: "2500" }],
  });
  await setContractStatus(a, k.id, "ACTIVE");
});

describe("recurring schedule generation", () => {
  it("creates one work order per service day and is idempotent", async () => {
    const from = isoDay(0), to = isoDay(13);
    const r1 = await generateRecurringWorkOrders(a, { from, to });
    expect(r1.created).toBe(4); // two Mondays + two Thursdays in any 14-day window
    const r2 = await generateRecurringWorkOrders(a, { from, to });
    expect(r2).toEqual({ created: 0, skipped: 4 });
    expect(await prisma.workOrder.count({ where: { organizationId: a.org.id, contractLineId: { not: null } } })).toBe(4);
  });

  it("rejects oversize ranges and non-dispatchers", async () => {
    await expect(generateRecurringWorkOrders(a, { from: isoDay(0), to: isoDay(40) })).rejects.toThrow("errors.schedule.range");
    await expect(generateRecurringWorkOrders(worker, { from: isoDay(0), to: isoDay(3) })).rejects.toThrow("errors.forbidden");
  });

  it("never generates for another tenant's contracts", async () => {
    const r = await generateRecurringWorkOrders(b, { from: isoDay(0), to: isoDay(13) });
    expect(r.created).toBe(0);
  });

  it("scheduled work is invoiced at its own contract line price", async () => {
    const wo = await prisma.workOrder.findFirstOrThrow({ where: { organizationId: a.org.id, contractLineId: { not: null } }, orderBy: { scheduledDate: "asc" } });
    const team = await createTeam(a, { name: "T1" });
    await addTeamMember(a, team.id, worker.membershipId);
    await assignWorkOrder(a, wo.id, { teamId: team.id, scheduledDate: wo.scheduledDate.toISOString().slice(0, 10) });
    await prisma.workOrder.update({ where: { id: wo.id }, data: { status: "COMPLETED" } }); // evidence rules covered elsewhere
    const inv = await createDraftInvoice(a, { customerId, workOrderIds: [wo.id] });
    expect((await getInvoice(a, inv.id)).subtotal.toString()).toBe("2500");
  });
});

describe("container tracking", () => {
  let id: string;
  it("delivers to a customer, keeps history, and enforces transitions", async () => {
    id = (await createContainer(a, { code: "skp-001", type: "SKIP_10M3" })).id;
    await expect(createContainer(a, { code: "SKP-001", type: "SKIP_6M3" })).rejects.toThrow("errors.container.codeTaken");
    await expect(moveContainer(a, { containerId: id, action: "remove" })).rejects.toThrow("errors.invalidTransition");
    await expect(moveContainer(a, { containerId: id, action: "deliver" })).rejects.toThrow("errors.validation");
    expect(await moveContainer(a, { containerId: id, action: "deliver", serviceLocationId: locationId })).toBe("AT_CUSTOMER");
    const c = await getContainer(a, id);
    expect(c.serviceLocation?.label).toBe("Gate 2");
    expect(await moveContainer(a, { containerId: id, action: "remove" })).toBe("IN_YARD");
    expect((await getContainer(a, id)).movements.map((m) => m.kind)).toEqual(["REMOVED", "DELIVERED"]);
  });

  it("field workers may only move containers within an in-progress job of their team", async () => {
    await expect(moveContainer(worker, { containerId: id, action: "deliver", serviceLocationId: locationId })).rejects.toThrow("errors.forbidden");
    const wo = await prisma.workOrder.findFirstOrThrow({ where: { organizationId: a.org.id, status: "PLANNED" } });
    const team = await prisma.team.findFirstOrThrow({ where: { organizationId: a.org.id } });
    await prisma.vehicle.create({ data: { organizationId: a.org.id, plateNumber: "V-1", label: "V" } }).then((v) =>
      assignWorkOrder(a, wo.id, { teamId: team.id, vehicleId: v.id, scheduledDate: wo.scheduledDate.toISOString().slice(0, 10) }));
    await transitionWorkOrder(worker, wo.id, "start");
    expect(await moveContainer(worker, { containerId: id, action: "deliver", serviceLocationId: locationId, workOrderId: wo.id })).toBe("AT_CUSTOMER");
    await expect(moveContainer(worker, { containerId: id, action: "maintenance", workOrderId: wo.id })).rejects.toThrow("errors.forbidden");
  });

  it("is invisible and immovable for another tenant", async () => {
    expect(await listContainers(b)).toHaveLength(0);
    await expect(getContainer(b, id)).rejects.toThrow("errors.notFound");
    await expect(moveContainer(b, { containerId: id, action: "remove" })).rejects.toThrow("errors.notFound");
    const locB = await addServiceLocation(b, (await createCustomer(b, { name: "B" })).id, { label: "B", addressLine: "x" });
    const free = await createContainer(a, { code: "BIN-9", type: "BIN_660L" });
    await expect(moveContainer(a, { containerId: free.id, action: "deliver", serviceLocationId: locB.id })).rejects.toThrow("errors.notFound");
  });
});

describe("global search and trends", () => {
  it("finds own records and nothing from other tenants", async () => {
    const hits = await globalSearch(a, "factory", "en");
    expect(hits.some((h) => h.type === "customer" && h.title.startsWith("Factory"))).toBe(true);
    expect(await globalSearch(b, "factory", "en")).toEqual([]);
    expect(await globalSearch(b, "SKP", "en")).toEqual([]);
    expect((await globalSearch(worker, "factory", "en")).some((h) => h.type === "customer")).toBe(false);
  });

  it("is accent-insensitive and treats LIKE wildcards literally", async () => {
    await createCustomer(a, { name: "Hôtel Démonstration" });
    expect((await globalSearch(a, "hotel demo", "en")).some((h) => h.title === "Hôtel Démonstration")).toBe(true);
    expect(await globalSearch(a, "%%", "en")).toEqual([]);
  });

  it("returns a continuous daily series", async () => {
    const t = await dailyTrend(a, 14);
    expect(t).toHaveLength(14);
    expect(t.every((d) => d.completed >= 0 && d.failed >= 0)).toBe(true);
  });
});
