import { beforeAll, describe, expect, it } from "vitest";
import { isoDay, jpegWithExif, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createCustomer, getCustomer, listCustomers, addServiceLocation, updateCustomer, addCustomerNote } from "@/server/services/customers";
import { createRequest, validateRequest } from "@/server/services/requests";
import { getWorkOrder, listWorkOrders, assignWorkOrder, addEvidence, transitionWorkOrder } from "@/server/services/work-orders";
import { createTeam } from "@/server/services/fleet";
import { getInvoice, listInvoices, recordPayment, createDraftInvoice } from "@/server/services/invoices";
import { getContract } from "@/server/services/contracts";
import type { OrgContext } from "@/server/context";

/** Scenario F — a user from tenant B must not reach tenant A's records through any service. */
let a: OrgContext, b: OrgContext;
let customerId: string, workOrderId: string, invoiceId: string, evidenceId: string;

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Tenant A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Tenant B")).ctx;
  const c = await createCustomer(a, { name: "Secret customer of A" });
  customerId = c.id;
  const loc = await addServiceLocation(a, customerId, { label: "Depot", addressLine: "Zone industrielle" });
  const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: a.org.id, code: "MSW" } });
  const req = await createRequest(a, { customerId, serviceLocationId: loc.id, wasteCategoryId: cat.id, preferredDate: isoDay(1) });
  const wo = await validateRequest(a, req.id);
  workOrderId = wo.id;
  const team = await createTeam(a, { name: "T" });
  await assignWorkOrder(a, workOrderId, { teamId: team.id, scheduledDate: isoDay(1) });
  evidenceId = (await addEvidence(a, workOrderId, "BEFORE", { name: "b.jpg", bytes: jpegWithExif() })).id;
  const inv = await prisma.invoice.create({
    data: { organizationId: a.org.id, customerId, status: "ISSUED", number: "INV-X-1", total: "100", subtotal: "100", createdById: a.userId },
  });
  invoiceId = inv.id;
});

describe("cross-tenant access is denied", () => {
  it("lists never include the other tenant's rows", async () => {
    expect(await listCustomers(b)).toHaveLength(0);
    expect(await listWorkOrders(b)).toHaveLength(0);
    expect(await listInvoices(b)).toHaveLength(0);
  });

  it("direct reads by id return not found", async () => {
    await expect(getCustomer(b, customerId)).rejects.toThrow("errors.notFound");
    await expect(getWorkOrder(b, workOrderId)).rejects.toThrow("errors.notFound");
    await expect(getInvoice(b, invoiceId)).rejects.toThrow("errors.notFound");
    await expect(getContract(b, "nonexistent")).rejects.toThrow("errors.notFound");
  });

  it("writes by id are rejected and leave data unchanged", async () => {
    await expect(updateCustomer(b, customerId, { name: "pwned" })).rejects.toThrow("errors.notFound");
    await expect(addCustomerNote(b, customerId, { body: "x" })).rejects.toThrow("errors.notFound");
    await expect(transitionWorkOrder(b, workOrderId, "cancel")).rejects.toThrow("errors.notFound");
    await expect(addEvidence(b, workOrderId, "AFTER", { name: "x.jpg", bytes: jpegWithExif() })).rejects.toThrow("errors.notFound");
    await expect(recordPayment(b, invoiceId, { amount: "100", method: "CASH", receivedAt: isoDay(0), idempotencyKey: "cross-tenant-1" })).rejects.toThrow("errors.notFound");
    await expect(createDraftInvoice(b, { customerId, workOrderIds: [workOrderId] })).rejects.toThrow("errors.notFound");
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).name).toBe("Secret customer of A");
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).amountPaid.toString()).toBe("0");
  });

  it("cannot attach another tenant's location to its own request", async () => {
    const own = await createCustomer(b, { name: "B customer" });
    const loc = await prisma.serviceLocation.findFirstOrThrow({ where: { organizationId: a.org.id } });
    const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: b.org.id, code: "MSW" } });
    await expect(createRequest(b, { customerId: own.id, serviceLocationId: loc.id, wasteCategoryId: cat.id, preferredDate: isoDay(1) })).rejects.toThrow("errors.request.locationMismatch");
  });

  it("database composite foreign keys reject cross-tenant links even if code is bypassed", async () => {
    const loc = await prisma.serviceLocation.findFirstOrThrow({ where: { organizationId: a.org.id } });
    const own = await createCustomer(b, { name: "B customer 2" });
    await expect(
      prisma.workOrder.create({
        data: { organizationId: b.org.id, number: "WO-HACK", customerId: own.id, serviceLocationId: loc.id, scheduledDate: new Date(), createdById: b.userId },
      }),
    ).rejects.toThrow();
  });

  it("evidence row belongs to tenant A only", async () => {
    const ev = await prisma.evidenceFile.findUniqueOrThrow({ where: { id: evidenceId } });
    expect(ev.organizationId).toBe(a.org.id);
  });
});
