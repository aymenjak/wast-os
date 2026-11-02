import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { addMember, isoDay, jpegWithExif, newOrg, resetDb } from "../helpers/db";
import { createCustomer, addServiceLocation, getCustomer, addContact } from "@/server/services/customers";
import { createContract, setContractStatus } from "@/server/services/contracts";
import { createRequest, validateRequest, listRequests } from "@/server/services/requests";
import { assignWorkOrder, transitionWorkOrder, addEvidence, addWeightTicket, listWorkOrders, customerFeedback } from "@/server/services/work-orders";
import { createVehicle, createTeam, addTeamMember } from "@/server/services/fleet";
import { createDraftInvoice, issueInvoice, recordPayment, getInvoice, voidInvoice } from "@/server/services/invoices";
import { businessDashboard } from "@/server/services/reports";
import type { OrgContext } from "@/server/context";

let owner: OrgContext;
let dispatcher: OrgContext;
let worker: OrgContext;
let otherWorker: OrgContext;
let finance: OrgContext;

beforeAll(async () => {
  await resetDb();
  owner = (await newOrg("SERVICE_PROVIDER", "EcoCollecte Oran")).ctx;
  await prisma.subscription.update({ where: { organizationId: owner.org.id }, data: { planCode: "PRO", status: "ACTIVE" } });
  dispatcher = await addMember(owner, "DISPATCHER");
  worker = await addMember(owner, "FIELD_WORKER");
  otherWorker = await addMember(owner, "FIELD_WORKER");
  finance = await addMember(owner, "FINANCE");
});

describe("Scenario A — workspace and invitations", () => {
  it("enforces the plan's user limit on invitations", async () => {
    const small = (await newOrg()).ctx; // STARTER: 5 users
    expect((await prisma.subscription.findUniqueOrThrow({ where: { organizationId: small.org.id } })).status).toBe("TRIAL");
    for (let i = 0; i < 4; i++) await addMember(small, "VIEWER");
    await expect(addMember(small, "VIEWER")).rejects.toThrow("errors.plan.limitReached");
  });

  it("only owners can grant ADMIN; dispatchers cannot invite at all", async () => {
    const admin = await addMember(owner, "ADMIN");
    await expect(addMember(admin, "ADMIN")).rejects.toThrow("errors.forbidden");
    await expect(addMember(dispatcher, "VIEWER")).rejects.toThrow("errors.forbidden");
  });

  it("creates org with owner, trial subscription and default waste categories", async () => {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: owner.org.id }, include: { subscription: true, wasteCategories: true } });
    expect(org.subscription?.planCode).toBe("PRO"); // upgraded in setup; new orgs start on TRIAL (see plan-limit test)
    expect(org.wasteCategories.length).toBeGreaterThanOrEqual(8);
    expect(owner.role).toBe("OWNER");
    expect(dispatcher.role).toBe("DISPATCHER");
  });
});

describe("Scenarios B–E — customer to paid invoice", () => {
  let customerId: string, locationId: string, contractId: string, workOrderId: string, invoiceId: string;

  it("B: registers a customer, location and active contract; schedules a collection", async () => {
    const c = await createCustomer(dispatcher, { name: "Hôtel Le Méridien Oran", kind: "BUSINESS", taxId: "000231012345678" });
    customerId = c.id;
    expect(c.code).toBe("CUS-0001");
    await addContact(dispatcher, customerId, { name: "Amina B.", jobTitle: "Facility manager", isPrimary: "on" });
    const loc = await addServiceLocation(dispatcher, customerId, { label: "Main kitchen", addressLine: "Bd du Front de Mer", wilaya: "Oran", latitude: "35.7058", longitude: "-0.6459" });
    locationId = loc.id;
    const geog = await prisma.$queryRaw<{ x: number }[]>`SELECT ST_X("geog"::geometry) AS x FROM "ServiceLocation" WHERE "id" = ${loc.id}`;
    expect(geog[0]?.x).toBeCloseTo(-0.6459, 4);

    const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: owner.org.id, code: "MSW" } });
    const contract = await createContract(owner, {
      customerId, title: "Collecte quotidienne", startDate: isoDay(-10), endDate: isoDay(355),
      lines: [{ serviceLocationId: locationId, wasteCategoryId: cat.id, frequency: "DAILY", weekdays: [], billingUnit: "PER_TONNE", unitPrice: "4500.00" }],
    });
    contractId = contract.id;
    await setContractStatus(owner, contractId, "ACTIVE");

    const req = await createRequest(dispatcher, {
      customerId, serviceLocationId: locationId, contractId, wasteCategoryId: cat.id,
      preferredDate: isoDay(0), estimatedQuantity: "2", quantityUnit: "CONTAINER", priority: "HIGH",
    });
    expect(req.number).toBe("REQ-00001");
    const wo = await validateRequest(dispatcher, req.id);
    workOrderId = wo.id;
    expect(wo.status).toBe("PLANNED");
    const reqs = await listRequests(dispatcher);
    expect(reqs[0]?.status).toBe("SCHEDULED");
  });

  it("C: dispatcher assigns team and vehicle", async () => {
    const team = await createTeam(dispatcher, { name: "Équipe A" });
    await addTeamMember(dispatcher, team.id, worker.membershipId);
    const v = await createVehicle(dispatcher, { plateNumber: "01234-121-31", label: "Benne 1", type: "COMPACTOR", capacityKg: "8000" });
    const to = await assignWorkOrder(dispatcher, workOrderId, { teamId: team.id, vehicleId: v.id, scheduledDate: isoDay(0) });
    expect(to).toBe("ASSIGNED");
  });

  it("D: only the assigned team's worker can execute; completion requires evidence", async () => {
    expect(await listWorkOrders(otherWorker)).toHaveLength(0);
    await expect(transitionWorkOrder(otherWorker, workOrderId, "start")).rejects.toThrow("errors.forbidden");
    await expect(transitionWorkOrder(worker, workOrderId, "complete")).rejects.toThrow("errors.invalidTransition");
    expect(await transitionWorkOrder(worker, workOrderId, "start")).toBe("IN_PROGRESS");
    await expect(transitionWorkOrder(worker, workOrderId, "complete")).rejects.toThrow("errors.workOrder.evidenceRequired");

    const ev = await addEvidence(worker, workOrderId, "AFTER", { name: "after.jpg", bytes: jpegWithExif() });
    expect(ev.mimeType).toBe("image/jpeg");
    await addWeightTicket(worker, workOrderId, { grossKg: "12350", tareKg: "9900", ticketNumber: "PB-778" });
    expect(await transitionWorkOrder(worker, workOrderId, "complete", { completionNotes: "OK" })).toBe("COMPLETED");
    const req = await prisma.collectionRequest.findFirstOrThrow({ where: { workOrder: { id: workOrderId } } });
    expect(req.status).toBe("COMPLETED");
  });

  it("D: rejects non-image evidence disguised as an image", async () => {
    const html = new TextEncoder().encode("<script>alert(1)</script>");
    await expect(addEvidence(worker, workOrderId, "AFTER", { name: "x.jpg", bytes: html })).rejects.toThrow("errors.upload.type");
  });

  it("E: invoice is built from the validated work order and contract price", async () => {
    await expect(createDraftInvoice(dispatcher, { customerId, workOrderIds: [workOrderId] })).rejects.toThrow("errors.forbidden");
    const draft = await createDraftInvoice(finance, { customerId, workOrderIds: [workOrderId] });
    invoiceId = draft.id;
    const inv = await getInvoice(finance, invoiceId);
    // 2450 kg = 2.450 t × 4500.00 = 11025.00; VAT 19% = 2094.75; total 13119.75
    expect(inv.lines[0]?.quantity.toString()).toBe("2.45");
    expect(inv.subtotal.toString()).toBe("11025");
    expect(inv.taxTotal.toString()).toBe("2094.75");
    expect(inv.total.toString()).toBe("13119.75");
    await expect(createDraftInvoice(finance, { customerId, workOrderIds: [workOrderId] })).rejects.toThrow("errors.invoice.alreadyInvoiced");

    const number = await issueInvoice(finance, invoiceId, { issueDate: isoDay(0), dueDate: isoDay(30) });
    expect(number).toMatch(/^INV-\d{4}-00001$/);
  });

  it("E: records partial then full payment accurately; rejects overpayment", async () => {
    const p1 = await recordPayment(finance, invoiceId, { amount: "5000", method: "BANK_TRANSFER", receivedAt: isoDay(0), idempotencyKey: "form-aaaaaaaa-1" });
    expect(p1.duplicate).toBe(false);
    expect((await getInvoice(finance, invoiceId)).status).toBe("PARTIALLY_PAID");
    await expect(recordPayment(finance, invoiceId, { amount: "9000", method: "CASH", receivedAt: isoDay(0), idempotencyKey: "form-aaaaaaaa-2" })).rejects.toThrow("errors.payment.exceedsBalance");
    await recordPayment(finance, invoiceId, { amount: "8119.75", method: "CHEQUE", receivedAt: isoDay(0), idempotencyKey: "form-aaaaaaaa-3" });
    const inv = await getInvoice(finance, invoiceId);
    expect(inv.status).toBe("PAID");
    expect(inv.amountPaid.toString()).toBe("13119.75");
    await expect(voidInvoice(finance, invoiceId, { reason: "mistake" })).rejects.toThrow();
  });

  it("customer portal user sees only their own records and can confirm service", async () => {
    const portal = await addMember(owner, "CUSTOMER_PORTAL", customerId);
    const other = await createCustomer(owner, { name: "Other Co" });
    const wos = await listWorkOrders(portal);
    expect(wos.map((w) => w.id)).toEqual([workOrderId]);
    await customerFeedback(portal, workOrderId, { decision: "confirm" });
    expect((await prisma.workOrder.findUniqueOrThrow({ where: { id: workOrderId } })).customerConfirmedAt).not.toBeNull();
    await expect(getCustomer(portal, other.id)).rejects.toThrow("errors.forbidden");
  });

  it("dashboard aggregates reflect the recorded operations", async () => {
    const d = await businessDashboard(owner, { from: isoDay(-30), to: isoDay(0) });
    expect(d.workOrders.completed).toBe(1);
    expect(d.tonnage[0]?.netKgMinor).toBe(245000);
    expect(d.revenue.collectedMinor).toBe(1311975);
    expect(d.receivables.outstandingMinor).toBe(0);
  });

  it("writes an audit trail for the work order lifecycle", async () => {
    const events = await prisma.auditEvent.findMany({ where: { entityType: "WorkOrder", entityId: workOrderId }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.action)).toEqual(
      expect.arrayContaining(["workorder.created", "workorder.assigned", "workorder.start", "workorder.evidence_added", "workorder.complete"]),
    );
  });
});
