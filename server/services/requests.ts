import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, InvalidTransitionError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { dateOnly, isoDate, optionalText, parse, quantity } from "../validation";
import type { RequestStatus } from "@/lib/generated/prisma/enums";

const requestSchema = z.object({
  customerId: z.string().min(1),
  serviceLocationId: z.string().min(1),
  contractId: optionalText(64),
  wasteCategoryId: z.string().min(1),
  estimatedQuantity: z.preprocess((v) => (v === "" ? undefined : v), quantity.optional()),
  quantityUnit: z.enum(["KG", "TONNE", "CUBIC_METRE", "CONTAINER", "BAG"]).default("CONTAINER"),
  preferredDate: isoDate,
  preferredWindow: z.enum(["ANY", "MORNING", "AFTERNOON", "EVENING"]).default("ANY"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  notes: optionalText(2000),
});

export async function listRequests(ctx: OrgContext, opts: { status?: RequestStatus } = {}) {
  if (ctx.role === "CUSTOMER_PORTAL") {
    requirePermission(ctx, "portal.access");
  } else requirePermission(ctx, "requests.read");
  return prisma.collectionRequest.findMany({
    where: {
      organizationId: ctx.org.id,
      status: opts.status,
      ...(ctx.role === "CUSTOMER_PORTAL" ? { customerId: ctx.customerId ?? "__none__" } : {}),
    },
    include: {
      customer: { select: { name: true } },
      serviceLocation: { select: { label: true } },
      wasteCategory: true,
      workOrder: { select: { id: true, number: true, status: true } },
    },
    orderBy: [{ preferredDate: "asc" }, { createdAt: "asc" }],
    take: 300,
  });
}

/** Creates a request. Portal users are pinned to their own customer regardless of input. */
export async function createRequest(ctx: OrgContext, input: unknown) {
  const portal = ctx.role === "CUSTOMER_PORTAL";
  requirePermission(ctx, portal ? "portal.access" : "requests.write");
  const raw = parse(requestSchema, portal ? { ...(input as object), customerId: ctx.customerId ?? "" } : input);
  if (portal && !ctx.customerId) throw new ForbiddenError();
  const today = new Date().toISOString().slice(0, 10);
  if (raw.preferredDate < today) throw new DomainError("errors.validation", { fields: { preferredDate: "past" } });

  return prisma.$transaction(async (tx) => {
    const loc = await tx.serviceLocation.findFirst({
      where: { id: raw.serviceLocationId, organizationId: ctx.org.id, customerId: raw.customerId, active: true },
    });
    if (!loc) throw new DomainError("errors.request.locationMismatch");
    const cat = await tx.wasteCategory.findFirst({ where: { id: raw.wasteCategoryId, organizationId: ctx.org.id, active: true } });
    if (!cat) throw new NotFoundError("WasteCategory");
    if (raw.contractId) {
      const contract = await tx.contract.findFirst({
        where: { id: raw.contractId, organizationId: ctx.org.id, customerId: raw.customerId, status: "ACTIVE" },
      });
      if (!contract) throw new DomainError("errors.request.contractInvalid");
    }
    const number = await nextNumber(tx, ctx.org.id, "request", "REQ");
    const req = await tx.collectionRequest.create({
      data: {
        ...raw,
        contractId: raw.contractId ?? null,
        preferredDate: dateOnly(raw.preferredDate),
        organizationId: ctx.org.id,
        number,
        source: portal ? "PORTAL" : "STAFF",
        createdById: ctx.userId,
      },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "request.created", entityType: "CollectionRequest", entityId: req.id, data: { number, source: req.source } });
    return req;
  });
}

/** Validating a request creates its work order in the same transaction. */
export async function validateRequest(ctx: OrgContext, requestId: string) {
  requirePermission(ctx, "requests.validate");
  return prisma.$transaction(async (tx) => {
    const req = await tx.collectionRequest.findFirst({ where: { id: requestId, organizationId: ctx.org.id } });
    if (!req) throw new NotFoundError("CollectionRequest");
    if (req.status !== "SUBMITTED") throw new InvalidTransitionError("CollectionRequest", req.status, "VALIDATED");
    if (req.contractId) {
      const contract = await tx.contract.findFirst({ where: { id: req.contractId, organizationId: ctx.org.id, status: "ACTIVE" } });
      if (!contract) throw new DomainError("errors.request.contractInvalid");
    }
    const number = await nextNumber(tx, ctx.org.id, "workorder", "WO");
    const wo = await tx.workOrder.create({
      data: {
        organizationId: ctx.org.id,
        number,
        kind: "COLLECTION",
        collectionRequestId: req.id,
        customerId: req.customerId,
        serviceLocationId: req.serviceLocationId,
        contractId: req.contractId,
        wasteCategoryId: req.wasteCategoryId,
        priority: req.priority,
        scheduledDate: req.preferredDate,
        instructions: req.notes,
        createdById: ctx.userId,
      },
    });
    await tx.collectionRequest.update({ where: { id: req.id }, data: { status: "SCHEDULED" } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "request.validated", entityType: "CollectionRequest", entityId: req.id, data: { workOrder: number } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "workorder.created", entityType: "WorkOrder", entityId: wo.id, data: { from: req.number } });
    return wo;
  });
}

export async function rejectRequest(ctx: OrgContext, requestId: string, input: unknown) {
  requirePermission(ctx, "requests.validate");
  const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(1000) }), input);
  return prisma.$transaction(async (tx) => {
    const r = await tx.collectionRequest.updateMany({
      where: { id: requestId, organizationId: ctx.org.id, status: "SUBMITTED" },
      data: { status: "REJECTED", rejectionReason: reason },
    });
    if (r.count === 0) throw new InvalidTransitionError("CollectionRequest", "?", "REJECTED");
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "request.rejected", entityType: "CollectionRequest", entityId: requestId, data: { reason } });
  });
}
