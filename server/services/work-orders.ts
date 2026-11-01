import { z } from "zod";
import { prisma, type Tx } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { planWorkOrderTransition, type WorkOrderAction } from "../domain/work-order-machine";
import { assertCivicTransition } from "../domain/civic-machine";
import { audit } from "../audit";
import { DOCUMENT_TYPES, IMAGE_TYPES, storeUpload } from "../storage";
import { dateOnly, isoDate, optionalText, parse } from "../validation";
import { toMinor, fromMinor } from "@/lib/money";
import { assertDestination, ticketRecyclingSchema } from "./recycling";
import type { CivicReportStatus as CivicStatus } from "@/lib/generated/prisma/enums";
import type { WorkOrderStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Field workers only see work orders assigned to one of their teams. */
async function visibilityFilter(ctx: OrgContext): Promise<Prisma.WorkOrderWhereInput> {
  const base: Prisma.WorkOrderWhereInput = { organizationId: ctx.org.id };
  if (ctx.role === "CUSTOMER_PORTAL") return { ...base, customerId: ctx.customerId ?? "__none__" };
  if (ctx.role === "FIELD_WORKER") {
    const teams = await prisma.teamMember.findMany({ where: { membershipId: ctx.membershipId }, select: { teamId: true } });
    return { ...base, teamId: { in: teams.map((t) => t.teamId) } };
  }
  return base;
}

function assertCanRead(ctx: OrgContext) {
  if (!(hasPermission(ctx, "workorders.read") || hasPermission(ctx, "portal.access"))) throw new ForbiddenError("workorders.read");
}

export async function listWorkOrders(
  ctx: OrgContext,
  opts: { status?: WorkOrderStatus; date?: string; from?: string; to?: string } = {},
) {
  assertCanRead(ctx);
  const where: Prisma.WorkOrderWhereInput = { ...(await visibilityFilter(ctx)), status: opts.status };
  if (opts.date) where.scheduledDate = dateOnly(opts.date);
  else if (opts.from || opts.to)
    where.scheduledDate = { gte: opts.from ? dateOnly(opts.from) : undefined, lte: opts.to ? dateOnly(opts.to) : undefined };
  return prisma.workOrder.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      serviceLocation: { select: { label: true, addressLine: true, latitude: true, longitude: true } },
      wasteCategory: true,
      team: { select: { name: true } },
      vehicle: { select: { plateNumber: true, label: true } },
      civicReport: { select: { trackingCode: true, category: true, addressHint: true, latitude: true, longitude: true } },
      invoiceLine: { select: { invoiceId: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { priority: "desc" }, { number: "asc" }],
    take: 500,
  });
}

export async function getWorkOrder(ctx: OrgContext, workOrderId: string) {
  assertCanRead(ctx);
  const wo = await prisma.workOrder.findFirst({
    where: { ...(await visibilityFilter(ctx)), id: workOrderId },
    include: {
      customer: true,
      serviceLocation: true,
      contract: { select: { id: true, reference: true, title: true } },
      wasteCategory: true,
      team: { include: { members: { include: { membership: { include: { user: { select: { name: true } } } } } } } },
      vehicle: true,
      weightTickets: { orderBy: { weighedAt: "asc" }, include: { destination: { select: { name: true, kind: true } } } },
      evidence: { orderBy: { createdAt: "asc" } },
      collectionRequest: { select: { number: true, notes: true } },
      civicReport: { select: { id: true, trackingCode: true, category: true, description: true } },
      invoiceLine: { select: { invoiceId: true } },
    },
  });
  if (!wo) throw new NotFoundError("WorkOrder");
  const history = await prisma.auditEvent.findMany({
    where: { organizationId: ctx.org.id, entityType: "WorkOrder", entityId: wo.id },
    orderBy: { createdAt: "asc" },
  });
  return { ...wo, history };
}

/** Execute actions require the worker to belong to the assigned team (dispatchers may act on any). */
async function assertExecutor(ctx: OrgContext, tx: Tx, teamId: string | null) {
  requirePermission(ctx, "workorders.execute");
  if (hasPermission(ctx, "workorders.dispatch")) return;
  if (!teamId) throw new ForbiddenError("workorders.execute");
  const member = await tx.teamMember.findUnique({ where: { teamId_membershipId: { teamId, membershipId: ctx.membershipId } } });
  if (!member) throw new ForbiddenError("workorders.execute");
}

const assignSchema = z.object({
  teamId: z.string().min(1),
  vehicleId: optionalText(64),
  scheduledDate: isoDate,
});

const transitionSchema = z.object({
  completionNotes: optionalText(4000),
  failureReason: z
    .enum(["NO_ACCESS", "CUSTOMER_ABSENT", "WASTE_NOT_READY", "WRONG_WASTE_TYPE", "VEHICLE_BREAKDOWN", "UNSAFE_CONDITIONS", "OTHER"])
    .optional(),
  failureNotes: optionalText(2000),
  disputeReason: optionalText(2000),
  scheduledDate: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
});

export async function assignWorkOrder(ctx: OrgContext, workOrderId: string, input: unknown) {
  requirePermission(ctx, "workorders.dispatch");
  const data = parse(assignSchema, input);
  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findFirst({ where: { id: workOrderId, organizationId: ctx.org.id } });
    if (!wo) throw new NotFoundError("WorkOrder");
    const team = await tx.team.findFirst({ where: { id: data.teamId, organizationId: ctx.org.id, active: true } });
    if (!team) throw new NotFoundError("Team");
    if (data.vehicleId) {
      const v = await tx.vehicle.findFirst({ where: { id: data.vehicleId, organizationId: ctx.org.id } });
      if (!v) throw new NotFoundError("Vehicle");
      if (v.status === "MAINTENANCE" || v.status === "RETIRED") throw new DomainError("errors.workOrder.vehicleUnavailable");
    }
    const to = planWorkOrderTransition(wo, "assign", { teamId: data.teamId });
    await tx.workOrder.update({
      where: { id: wo.id },
      data: { status: to, teamId: team.id, vehicleId: data.vehicleId ?? null, scheduledDate: dateOnly(data.scheduledDate) },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "workorder.assigned", entityType: "WorkOrder", entityId: wo.id, data: { team: team.name, vehicleId: data.vehicleId ?? null, date: data.scheduledDate } });
    return to;
  });
}

/** Runs a lifecycle action, keeping the linked request or civic report consistent in the same transaction. */
export async function transitionWorkOrder(ctx: OrgContext, workOrderId: string, action: Exclude<WorkOrderAction, "assign" | "dispute">, input: unknown = {}) {
  const data = parse(transitionSchema, input);
  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findFirst({ where: { id: workOrderId, organizationId: ctx.org.id }, include: { _count: { select: { evidence: true } } } });
    if (!wo) throw new NotFoundError("WorkOrder");
    const dispatchActions: WorkOrderAction[] = ["unassign", "cancel", "reschedule", "resolveDispute", "redo"];
    if (dispatchActions.includes(action)) requirePermission(ctx, "workorders.dispatch");
    else await assertExecutor(ctx, tx, wo.teamId);

    const to = planWorkOrderTransition(wo, action, {
      evidenceCount: wo._count.evidence,
      failureReason: data.failureReason,
    });
    const now = new Date();
    const patch: Prisma.WorkOrderUpdateInput = { status: to };
    if (action === "start") patch.actualStart = now;
    if (action === "complete") Object.assign(patch, { actualEnd: now, completionNotes: data.completionNotes });
    if (action === "fail") Object.assign(patch, { actualEnd: now, failureReason: data.failureReason, failureNotes: data.failureNotes });
    if (action === "unassign") Object.assign(patch, { team: { disconnect: true }, vehicle: { disconnect: true } });
    if (action === "reschedule") {
      if (!data.scheduledDate) throw new DomainError("errors.validation", { fields: { scheduledDate: "required" } });
      Object.assign(patch, { scheduledDate: dateOnly(data.scheduledDate), team: { disconnect: true }, vehicle: { disconnect: true }, actualStart: null, actualEnd: null, failureReason: null, failureNotes: null });
    }
    if (action === "redo") Object.assign(patch, { actualStart: null, actualEnd: null, disputeReason: null, customerConfirmedAt: null });

    await tx.workOrder.update({ where: { id: wo.id }, data: patch });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: `workorder.${action}`, entityType: "WorkOrder", entityId: wo.id, data: { from: wo.status, to, failureReason: data.failureReason ?? null } });

    if (wo.collectionRequestId) {
      const reqStatus = to === "COMPLETED" ? "COMPLETED" : to === "CANCELLED" ? "CANCELLED" : "SCHEDULED";
      await tx.collectionRequest.update({ where: { id: wo.collectionRequestId }, data: { status: reqStatus } });
    }
    if (wo.civicReportId) await syncCivicReport(tx, ctx, wo.civicReportId, to);
    return to;
  });
}

async function syncCivicReport(tx: Tx, ctx: OrgContext, reportId: string, woStatus: WorkOrderStatus) {
  const report = await tx.civicReport.findUniqueOrThrow({ where: { id: reportId } });
  const target = woStatus === "IN_PROGRESS" ? "IN_PROGRESS" : woStatus === "COMPLETED" ? "RESOLVED" : null;
  if (!target || report.status === target) return;
  assertCivicTransition(report.status, target, "system");
  await tx.civicReport.update({
    where: { id: report.id },
    data: { status: target, resolvedAt: target === "RESOLVED" ? new Date() : undefined },
  });
  await tx.civicReportEvent.create({
    data: { reportId: report.id, fromStatus: report.status, toStatus: target, actorType: "SYSTEM", actorUserId: ctx.userId },
  });
  if (target === "RESOLVED") await notifyCitizen(tx, report.organizationId, report.reporterContact, report.trackingCode, "RESOLVED", "civic.resolved");
}

/** Customer (portal) confirms or disputes a completed collection. */
export async function customerFeedback(ctx: OrgContext, workOrderId: string, input: unknown) {
  requirePermission(ctx, "portal.access");
  const data = parse(z.object({ decision: z.enum(["confirm", "dispute"]), disputeReason: optionalText(2000) }), input);
  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findFirst({ where: { id: workOrderId, organizationId: ctx.org.id, customerId: ctx.customerId ?? "__none__" } });
    if (!wo) throw new NotFoundError("WorkOrder");
    if (data.decision === "confirm") {
      if (wo.status !== "COMPLETED") throw new DomainError("errors.workOrder.notCompleted");
      await tx.workOrder.update({ where: { id: wo.id }, data: { customerConfirmedAt: new Date() } });
    } else {
      const to = planWorkOrderTransition(wo, "dispute", { disputeReason: data.disputeReason });
      await tx.workOrder.update({ where: { id: wo.id }, data: { status: to, disputeReason: data.disputeReason } });
    }
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: `workorder.customer_${data.decision}`, entityType: "WorkOrder", entityId: wo.id });
  });
}

export async function addEvidence(ctx: OrgContext, workOrderId: string, kind: "BEFORE" | "AFTER" | "DOCUMENT", file: { name: string; bytes: Uint8Array }) {
  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findFirst({ where: { id: workOrderId, organizationId: ctx.org.id } });
    if (!wo) throw new NotFoundError("WorkOrder");
    await assertExecutor(ctx, tx, wo.teamId);
    if (!["ASSIGNED", "IN_PROGRESS", "COMPLETED", "DISPUTED"].includes(wo.status)) throw new DomainError("errors.workOrder.evidenceClosed");
    const stored = await storeUpload(file, { prefix: `org/${ctx.org.id}/wo`, allow: kind === "DOCUMENT" ? DOCUMENT_TYPES : IMAGE_TYPES });
    const ev = await tx.evidenceFile.create({ data: { ...stored, organizationId: ctx.org.id, kind, workOrderId: wo.id, uploadedById: ctx.userId } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "workorder.evidence_added", entityType: "WorkOrder", entityId: wo.id, data: { evidenceId: ev.id, kind, sha256: stored.sha256 } });
    return ev;
  });
}

const weightSchema = z
  .object({
    ticketNumber: optionalText(60),
    grossKg: z.coerce.number().positive().max(100_000),
    tareKg: z.coerce.number().min(0).max(100_000),
    facility: optionalText(160),
  })
  .and(ticketRecyclingSchema)
  .refine((d) => d.grossKg >= d.tareKg, { path: ["tareKg"], message: "tareAboveGross" });

export async function addWeightTicket(ctx: OrgContext, workOrderId: string, input: unknown) {
  const data = parse(weightSchema, input);
  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findFirst({ where: { id: workOrderId, organizationId: ctx.org.id } });
    if (!wo) throw new NotFoundError("WorkOrder");
    await assertExecutor(ctx, tx, wo.teamId);
    if (!["IN_PROGRESS", "COMPLETED"].includes(wo.status)) throw new DomainError("errors.workOrder.weightClosed");
    const destination = await assertDestination(tx, ctx, data.destinationId);
    // Default stream: the work order's waste category (can be overridden per ticket for mixed loads).
    const category = wo.wasteCategoryId ? await tx.wasteCategory.findFirst({ where: { id: wo.wasteCategoryId, organizationId: ctx.org.id }, select: { stream: true } }) : null;
    const gross = toMinor(data.grossKg.toFixed(2));
    const tare = toMinor(data.tareKg.toFixed(2));
    const t = await tx.weightTicket.create({
      data: {
        organizationId: ctx.org.id,
        workOrderId: wo.id,
        ticketNumber: data.ticketNumber,
        grossKg: fromMinor(gross),
        tareKg: fromMinor(tare),
        netKg: fromMinor(gross - tare),
        facility: data.facility,
        weighedAt: new Date(),
        recordedById: ctx.userId,
        stream: data.stream ?? category?.stream ?? null,
        destinationId: destination?.id ?? null,
        contaminated: data.contaminated,
      },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "workorder.weight_recorded", entityType: "WorkOrder", entityId: wo.id, data: { netKg: fromMinor(gross - tare) } });
    return t;
  });
}

/** Data for the dispatch board: one day, grouped by team, with an unassigned column. */
export async function dispatchBoard(ctx: OrgContext, date: string) {
  requirePermission(ctx, "workorders.dispatch");
  const [orders, teams, vehicles] = await Promise.all([
    listWorkOrders(ctx, { date }),
    prisma.team.findMany({ where: { organizationId: ctx.org.id, active: true }, orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({ where: { organizationId: ctx.org.id, status: { in: ["AVAILABLE", "IN_SERVICE"] } }, orderBy: { plateNumber: "asc" } }),
  ]);
  const backlog = await prisma.workOrder.findMany({
    where: { organizationId: ctx.org.id, status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] }, scheduledDate: { lt: dateOnly(date) } },
    include: { customer: { select: { name: true } }, civicReport: { select: { trackingCode: true } } },
    orderBy: { scheduledDate: "asc" },
    take: 50,
  });
  return { orders, teams, vehicles, backlog };
}

/**
 * Authorizes an evidence download. The file must belong to the caller's organization AND the caller
 * must be able to see the parent record (team scoping for field workers, customer scoping for portal).
 */
export async function getEvidenceForDownload(ctx: OrgContext, evidenceId: string) {
  const ev = await prisma.evidenceFile.findFirst({ where: { id: evidenceId, organizationId: ctx.org.id } });
  if (!ev) throw new NotFoundError("EvidenceFile");
  if (ev.workOrderId) {
    assertCanRead(ctx);
    const visible = await prisma.workOrder.findFirst({ where: { ...(await visibilityFilter(ctx)), id: ev.workOrderId }, select: { id: true } });
    if (!visible) throw new NotFoundError("EvidenceFile");
  } else if (ev.civicReportId) {
    requirePermission(ctx, "civic.read");
  } else if (ev.contractId) {
    requirePermission(ctx, "contracts.read");
  } else throw new NotFoundError("EvidenceFile");
  return ev;
}

/** Email to the citizen when the contact is an email address (phone numbers need an SMS provider, not built). */
export async function notifyCitizen(tx: Prisma.TransactionClient, organizationId: string, contact: string | null, trackingCode: string, status: CivicStatus, type: string) {
  const { enqueueEmail, looksLikeEmail } = await import("./mailer");
  if (!looksLikeEmail(contact)) return;
  const { civicUpdateEmail } = await import("../email/templates");
  const { getDictionary } = await import("@/lib/i18n");
  const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true, defaultLocale: true } });
  const d = getDictionary(org.defaultLocale === "ar" || org.defaultLocale === "en" ? org.defaultLocale : "fr");
  const m = civicUpdateEmail(org.defaultLocale, org.name, trackingCode, d.enums.CivicReportStatus[status], `${process.env.APP_URL ?? ""}/${org.defaultLocale}/civic/track/${trackingCode}`);
  await enqueueEmail(tx, { organizationId, to: contact, type, ...m });
}
