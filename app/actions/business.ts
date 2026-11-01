"use server";
import type { ActionState } from "@/lib/actions/state";
import { orgAction } from "@/server/action";
import * as customers from "@/server/services/customers";
import * as contracts from "@/server/services/contracts";
import * as requests from "@/server/services/requests";
import * as wo from "@/server/services/work-orders";
import * as fleet from "@/server/services/fleet";
import * as invoices from "@/server/services/invoices";
import * as accounts from "@/server/services/accounts";
import { DomainError } from "@/server/domain/errors";
import type { WorkOrderAction } from "@/server/domain/work-order-machine";
import type { ContractStatus, VehicleStatus } from "@/lib/generated/prisma/enums";
import * as schedules from "@/server/services/schedules";
import * as containers from "@/server/services/containers";
import * as iot from "@/server/services/iot";
import * as recycling from "@/server/services/recycling";
import * as hazardous from "@/server/services/hazardous";
import * as yard from "@/server/services/yard";
import * as territory from "@/server/services/territory";
import { sendInvoiceEmail } from "@/server/services/mailer";
import { globalSearch, type SearchHit } from "@/server/services/search";
import { requireOrg } from "@/server/auth/session";
import { isLocale } from "@/lib/i18n/config";

const s = (v: unknown) => (typeof v === "string" ? v : "");

// ── Customers ──
export async function createCustomerAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => `/app/customers/${(await customers.createCustomer(ctx, input)).id}`);
}
export async function updateCustomerAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => customers.updateCustomer(ctx, s(input.customerId), input), { revalidate: [`/app/customers/${s(fd.get("customerId"))}`] });
}
export async function addContactAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await customers.addContact(ctx, s(input.customerId), input)), { revalidate: [`/app/customers/${s(fd.get("customerId"))}`] });
}
export async function addLocationAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await customers.addServiceLocation(ctx, s(input.customerId), input)), { revalidate: [`/app/customers/${s(fd.get("customerId"))}`] });
}
export async function addNoteAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await customers.addCustomerNote(ctx, s(input.customerId), input)), { revalidate: [`/app/customers/${s(fd.get("customerId"))}`] });
}

// ── Contracts ──
export async function createContractAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => {
    const count = Number(input.lineCount ?? 0);
    const lines = Array.from({ length: Math.min(Math.max(count, 0), 50) }, (_, i) => ({
      serviceLocationId: input[`lines.${i}.serviceLocationId`],
      wasteCategoryId: input[`lines.${i}.wasteCategoryId`],
      frequency: input[`lines.${i}.frequency`],
      billingUnit: input[`lines.${i}.billingUnit`],
      unitPrice: input[`lines.${i}.unitPrice`],
      estimatedQuantity: input[`lines.${i}.estimatedQuantity`],
      weekdays: Array.isArray(input[`lines.${i}.weekdays`]) ? input[`lines.${i}.weekdays`] : [],
    })).filter((l) => l.serviceLocationId);
    const c = await contracts.createContract(ctx, { ...input, lines });
    return `/app/contracts/${c.id}`;
  });
}
export async function setContractStatusAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => contracts.setContractStatus(ctx, s(input.contractId), s(input.to) as ContractStatus), { revalidate: [`/app/contracts/${s(fd.get("contractId"))}`] });
}

// ── Requests ──
export async function createRequestAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => {
    await requests.createRequest(ctx, input);
    return ctx.role === "CUSTOMER_PORTAL" ? "/portal" : "/app/requests";
  });
}
export async function validateRequestAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await requests.validateRequest(ctx, s(input.requestId))), { revalidate: ["/app/requests", "/app/dispatch"] });
}
export async function rejectRequestAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => requests.rejectRequest(ctx, s(input.requestId), input), { revalidate: ["/app/requests"] });
}

// ── Work orders ──
export async function assignWorkOrderAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await wo.assignWorkOrder(ctx, s(input.workOrderId), input)), {
    revalidate: ["/app/dispatch", `/app/work-orders/${s(fd.get("workOrderId"))}`],
  });
}
const EXECUTABLE = new Set<WorkOrderAction>(["unassign", "start", "complete", "fail", "cancel", "reschedule", "resolveDispute", "redo"]);
export async function workOrderTransitionAction(_: ActionState, fd: FormData) {
  return orgAction(
    fd,
    async (ctx, input) => {
      const action = s(input.action) as WorkOrderAction;
      if (!EXECUTABLE.has(action)) throw new DomainError("errors.invalidTransition");
      await wo.transitionWorkOrder(ctx, s(input.workOrderId), action as Exclude<WorkOrderAction, "assign" | "dispute">, input);
    },
    { revalidate: [`/app/work-orders/${s(fd.get("workOrderId"))}`, "/app/work-orders", "/app/dispatch"] },
  );
}
export async function uploadEvidenceAction(_: ActionState, fd: FormData) {
  const file = fd.get("file");
  return orgAction(
    fd,
    async (ctx, input) => {
      if (!(file instanceof File) || file.size === 0) throw new DomainError("errors.upload.empty");
      const kind = s(input.kind);
      if (!["BEFORE", "AFTER", "DOCUMENT"].includes(kind)) throw new DomainError("errors.validation");
      await wo.addEvidence(ctx, s(input.workOrderId), kind as "BEFORE" | "AFTER" | "DOCUMENT", { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    },
    { revalidate: [`/app/work-orders/${s(fd.get("workOrderId"))}`] },
  );
}
export async function addWeightAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await wo.addWeightTicket(ctx, s(input.workOrderId), input)), { revalidate: [`/app/work-orders/${s(fd.get("workOrderId"))}`] });
}
export async function customerFeedbackAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => wo.customerFeedback(ctx, s(input.workOrderId), input), { revalidate: ["/portal"] });
}

// ── Fleet ──
export async function createVehicleAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await fleet.createVehicle(ctx, input)), { revalidate: ["/app/fleet"] });
}
export async function setVehicleStatusAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => fleet.setVehicleStatus(ctx, s(input.vehicleId), s(input.status) as VehicleStatus), { revalidate: ["/app/fleet", `/app/fleet/${s(fd.get("vehicleId"))}`] });
}
export async function addMaintenanceAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await fleet.addMaintenance(ctx, s(input.vehicleId), input)), { revalidate: [`/app/fleet/${s(fd.get("vehicleId"))}`] });
}
export async function createTeamAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await fleet.createTeam(ctx, input)), { revalidate: ["/app/fleet"] });
}
export async function addTeamMemberAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => fleet.addTeamMember(ctx, s(input.teamId), s(input.membershipId)), { revalidate: ["/app/fleet"] });
}
export async function removeTeamMemberAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => fleet.removeTeamMember(ctx, s(input.teamId), s(input.membershipId)), { revalidate: ["/app/fleet"] });
}

// ── Invoices & payments ──
export async function createDraftInvoiceAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => {
    const inv = await invoices.createDraftInvoice(ctx, { ...input, workOrderIds: input.workOrderIds ?? [] });
    return `/app/invoices/${inv.id}`;
  });
}
export async function addInvoiceLineAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => invoices.addManualLine(ctx, s(input.invoiceId), input), { revalidate: [`/app/invoices/${s(fd.get("invoiceId"))}`] });
}
export async function removeInvoiceLineAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => invoices.removeLine(ctx, s(input.invoiceId), s(input.lineId)), { revalidate: [`/app/invoices/${s(fd.get("invoiceId"))}`] });
}
export async function issueInvoiceAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await invoices.issueInvoice(ctx, s(input.invoiceId), input)), { revalidate: [`/app/invoices/${s(fd.get("invoiceId"))}`, "/app/invoices"] });
}
export async function voidInvoiceAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => invoices.voidInvoice(ctx, s(input.invoiceId), input), { revalidate: [`/app/invoices/${s(fd.get("invoiceId"))}`, "/app/invoices"] });
}
export async function recordPaymentAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await invoices.recordPayment(ctx, s(input.invoiceId), input)), { revalidate: [`/app/invoices/${s(fd.get("invoiceId"))}`, "/app/invoices"] });
}
export async function reversePaymentAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => invoices.reverseRecordedPayment(ctx, s(input.paymentId), input), { revalidate: [`/app/invoices/${s(fd.get("invoiceId"))}`] });
}

// ── Team & settings ──
export async function inviteMemberAction(_: ActionState, fd: FormData) {
  return orgAction(
    fd,
    async (ctx, input, locale) => {
      const { token } = await accounts.inviteMember(ctx, input);
      const base = process.env.APP_URL ?? "";
      return { data: { inviteUrl: `${base}/${locale}/invite/${token}` } };
    },
    { revalidate: ["/app/team"] },
  );
}
export async function revokeInvitationAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => accounts.revokeInvitation(ctx, s(input.invitationId)), { revalidate: ["/app/team"] });
}
export async function changeRoleAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => accounts.changeMemberRole(ctx, input), { revalidate: ["/app/team"] });
}
export async function setMemberStatusAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => accounts.setMemberStatus(ctx, s(input.membershipId), s(input.status) === "ACTIVE" ? "ACTIVE" : "SUSPENDED"), { revalidate: ["/app/team"] });
}
export async function updateSettingsAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await accounts.updateOrganizationSettings(ctx, input)), { revalidate: ["/app/settings"] });
}

// ── Schedules, containers, search ──

export async function generateScheduleAction(_: ActionState, fd: FormData) {
  return orgAction(
    fd,
    async (ctx, input) => {
      const r = await schedules.generateRecurringWorkOrders(ctx, input);
      return { data: { created: String(r.created), skipped: String(r.skipped) } };
    },
    { revalidate: ["/app/dispatch"] },
  );
}
export async function createContainerAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await containers.createContainer(ctx, input)), { revalidate: ["/app/containers"] });
}
export async function moveContainerAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await containers.moveContainer(ctx, input)), {
    revalidate: ["/app/containers", `/app/containers/${s(fd.get("containerId"))}`, `/app/work-orders/${s(fd.get("workOrderId"))}`],
  });
}
/** Read-only search for the command palette. Scoped by the caller's session and permissions. */
export async function searchAction(query: string, locale: string): Promise<SearchHit[]> {
  const l = isLocale(locale) ? locale : "fr";
  const ctx = await requireOrg(l);
  return globalSearch(ctx, String(query ?? ""), l);
}

// ── IoT ──
export async function registerDeviceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let key = "";
  const r = await orgAction(fd, async (ctx, input) => void (key = (await iot.registerDevice(ctx, input)).key), { revalidate: ["/app/iot"] });
  return r.ok ? { ...r, data: { key } } : r;
}
export async function revokeDeviceAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => iot.revokeDevice(ctx, s(fd.get("deviceId"))), { revalidate: ["/app/iot"] });
}
export async function resolveAlertAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => iot.resolveAlert(ctx, s(fd.get("alertId"))), { revalidate: ["/app/iot"] });
}
export async function registerIntegrationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let key = "";
  const r = await orgAction(fd, async (ctx, input) => void (key = (await iot.registerIntegration(ctx, input)).key), { revalidate: ["/app/iot"] });
  return r.ok ? { ...r, data: { key } } : r;
}
export async function revokeIntegrationAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => iot.revokeIntegration(ctx, s(fd.get("integrationId"))), { revalidate: ["/app/iot"] });
}
export async function sendInvoiceEmailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let out: Record<string, string> = {};
  const r = await orgAction(fd, async (ctx, input) => {
    const res = await sendInvoiceEmail(ctx, s(input.invoiceId), input);
    out = { to: res.to, configured: String(res.deliveryConfigured) };
  });
  return r.ok ? { ...r, data: out } : r;
}

// ── Recycling ──
export async function recordRejectsAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => recycling.recordRejects(ctx, s(input.ticketId), input), { revalidate: ["/app/work-orders", "/app/recycling"] });
}
export async function createDestinationAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await recycling.createDestination(ctx, input)), { revalidate: ["/app/recycling/destinations"] });
}
export async function setDestinationActiveAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => recycling.setDestinationActive(ctx, s(fd.get("destinationId")), fd.get("active") === "true"), { revalidate: ["/app/recycling/destinations"] });
}
export async function classifyCategoryAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => recycling.classifyCategory(ctx, s(input.categoryId), input), { revalidate: ["/app/recycling/destinations"] });
}

// ── Special hazardous waste (décrets 04-409, 05-315) ──
export async function createAuthorisationAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await hazardous.createAuthorisation(ctx, input)), { revalidate: ["/app/recycling/hazardous"] });
}
export async function setAuthorisationActiveAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => hazardous.setAuthorisationActive(ctx, s(fd.get("authorisationId")), fd.get("active") === "true"), { revalidate: ["/app/recycling/hazardous"] });
}
export async function createMovementAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => `/app/recycling/hazardous/${(await hazardous.createMovement(ctx, input)).id}`);
}
export async function pickUpMovementAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => hazardous.pickUp(ctx, s(input.movementId), input), { revalidate: [`/app/recycling/hazardous/${s(fd.get("movementId"))}`] });
}
export async function deliverMovementAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => hazardous.deliver(ctx, s(input.movementId), input), { revalidate: [`/app/recycling/hazardous/${s(fd.get("movementId"))}`] });
}
export async function refuseMovementAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => hazardous.refuse(ctx, s(input.movementId), input), { revalidate: [`/app/recycling/hazardous/${s(fd.get("movementId"))}`] });
}
export async function cancelMovementAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => hazardous.cancelMovement(ctx, s(fd.get("movementId"))), { revalidate: [`/app/recycling/hazardous/${s(fd.get("movementId"))}`] });
}
export async function confirmTreatmentAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => hazardous.confirmTreatment(ctx, s(input.movementId), input), { revalidate: [`/app/recycling/hazardous/${s(fd.get("movementId"))}`] });
}

// ── R2 sorting yard ──
const rows = (input: Record<string, unknown>, prefix: string, n: number, fields: string[]) =>
  Array.from({ length: n }, (_, i) => Object.fromEntries(fields.map((f) => [f, input[`${prefix}.${i}.${f}`]])));

export async function createSupplierAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await yard.createSupplier(ctx, input)), { revalidate: ["/app/recycling/yard/purchases"] });
}
export async function createPurchaseAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => `/app/recycling/yard/purchases/${(await yard.createPurchase(ctx, { ...input, lines: rows(input, "lines", 4, ["stream", "grade", "grossKg", "tareKg", "unitPrice"]) })).id}`);
}
export async function markPurchasePaidAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => yard.markPurchasePaid(ctx, s(fd.get("purchaseId"))), { revalidate: [`/app/recycling/yard/purchases/${s(fd.get("purchaseId"))}`] });
}
export async function voidPurchaseAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => yard.voidPurchase(ctx, s(input.purchaseId), input), { revalidate: [`/app/recycling/yard/purchases/${s(fd.get("purchaseId"))}`] });
}
export async function createBaleAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await yard.createBale(ctx, input)), { revalidate: ["/app/recycling/yard"] });
}
export async function voidBaleAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => yard.voidBale(ctx, s(fd.get("baleId"))), { revalidate: ["/app/recycling/yard"] });
}
export async function addAdjustmentAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await yard.addAdjustment(ctx, input)), { revalidate: ["/app/recycling/yard"] });
}
export async function createSaleAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => {
    const prices = Object.fromEntries(Object.entries(input).filter(([k]) => k.startsWith("price.")).map(([k, v]) => [k.slice(6), v]));
    const sale = await yard.createSale(ctx, { yardId: input.yardId, buyerId: input.buyerId, baleIds: input.baleIds ?? [], loose: rows(input, "loose", 2, ["stream", "grade", "weightKg"]), prices });
    return `/app/recycling/yard/sales/${sale.id}`;
  });
}
export async function deliverSaleAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => yard.deliverSale(ctx, s(input.saleId), input), { revalidate: [`/app/recycling/yard/sales/${s(fd.get("saleId"))}`] });
}
export async function recordClaimAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => yard.recordClaim(ctx, s(input.saleId), input), { revalidate: [`/app/recycling/yard/sales/${s(fd.get("saleId"))}`] });
}
export async function settleSaleAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => yard.settleSale(ctx, s(fd.get("saleId"))), { revalidate: [`/app/recycling/yard/sales/${s(fd.get("saleId"))}`] });
}
export async function cancelSaleAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => yard.cancelSale(ctx, s(fd.get("saleId"))), { revalidate: [`/app/recycling/yard/sales/${s(fd.get("saleId"))}`] });
}

// ── R3 territory ──
export async function setLocalTargetAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => territory.setLocalTarget(ctx, input), { revalidate: ["/app/recycling/territory"] });
}
export async function createCampaignAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await territory.createCampaign(ctx, input)), { revalidate: ["/app/recycling/campaigns"] });
}
export async function createDropOffPointAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await territory.createDropOffPoint(ctx, input)), { revalidate: ["/app/recycling/drop-off"] });
}
export async function assignContainerAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => territory.assignContainer(ctx, input), { revalidate: ["/app/recycling/drop-off"] });
}
