import { z } from "zod";
import { prisma, type Tx } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, InvalidTransitionError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { optionalText, parse } from "../validation";
import type { ContainerStatus } from "@/lib/generated/prisma/enums";

const TYPES = ["BIN_240L", "BIN_660L", "BIN_1100L", "SKIP_6M3", "SKIP_10M3", "ROLLOFF_20M3", "ROLLOFF_30M3", "COMPACTOR_UNIT", "OTHER"] as const;

export async function listContainers(ctx: OrgContext, opts: { status?: ContainerStatus } = {}) {
  requirePermission(ctx, "fleet.read");
  return prisma.container.findMany({
    where: { organizationId: ctx.org.id, status: opts.status },
    include: { serviceLocation: { select: { label: true, customer: { select: { id: true, name: true } } } } },
    orderBy: [{ status: "asc" }, { code: "asc" }],
  });
}

export async function getContainer(ctx: OrgContext, id: string) {
  requirePermission(ctx, "fleet.read");
  const c = await prisma.container.findFirst({
    where: { id, organizationId: ctx.org.id },
    include: {
      serviceLocation: { include: { customer: { select: { id: true, name: true } } } },
      movements: { orderBy: { occurredAt: "desc" }, include: { serviceLocation: { select: { label: true } }, workOrder: { select: { id: true, number: true } } } },
    },
  });
  if (!c) throw new NotFoundError("Container");
  return c;
}

export async function createContainer(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const data = parse(z.object({ code: z.string().trim().min(1).max(30).transform((s) => s.toUpperCase()), type: z.enum(TYPES), notes: optionalText(500) }), input);
  return prisma.$transaction(async (tx) => {
    if (await tx.container.findFirst({ where: { organizationId: ctx.org.id, code: data.code } })) throw new DomainError("errors.container.codeTaken");
    const c = await tx.container.create({ data: { ...data, organizationId: ctx.org.id } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "container.created", entityType: "Container", entityId: c.id });
    return c;
  });
}

/** Dispatchers can move any container; field workers only within a work order assigned to their team. */
async function assertMover(ctx: OrgContext, tx: Tx, workOrderId: string | undefined) {
  if (hasPermission(ctx, "fleet.write")) return;
  requirePermission(ctx, "workorders.execute");
  if (!workOrderId) throw new ForbiddenError("fleet.write");
  const wo = await tx.workOrder.findFirst({ where: { id: workOrderId, organizationId: ctx.org.id }, select: { teamId: true, status: true } });
  if (!wo?.teamId || wo.status !== "IN_PROGRESS") throw new ForbiddenError("workorders.execute");
  const member = await tx.teamMember.findUnique({ where: { teamId_membershipId: { teamId: wo.teamId, membershipId: ctx.membershipId } } });
  if (!member) throw new ForbiddenError("workorders.execute");
}

const moveSchema = z.object({
  containerId: z.string().min(1),
  action: z.enum(["deliver", "remove", "maintenance", "backInService", "retire"]),
  serviceLocationId: optionalText(64),
  workOrderId: optionalText(64),
  notes: optionalText(500),
});

const RULES = {
  deliver: { from: ["IN_YARD"], to: "AT_CUSTOMER", kind: "DELIVERED" },
  remove: { from: ["AT_CUSTOMER"], to: "IN_YARD", kind: "REMOVED" },
  maintenance: { from: ["IN_YARD", "AT_CUSTOMER"], to: "MAINTENANCE", kind: "TO_MAINTENANCE" },
  backInService: { from: ["MAINTENANCE"], to: "IN_YARD", kind: "BACK_IN_SERVICE" },
  retire: { from: ["IN_YARD", "MAINTENANCE"], to: "RETIRED", kind: "RETIRED" },
} as const satisfies Record<string, { from: readonly ContainerStatus[]; to: ContainerStatus; kind: string }>;

export async function moveContainer(ctx: OrgContext, input: unknown) {
  const data = parse(moveSchema, input);
  return prisma.$transaction(async (tx) => {
    await assertMover(ctx, tx, data.workOrderId);
    if (["maintenance", "backInService", "retire"].includes(data.action)) requirePermission(ctx, "fleet.write");
    const c = await tx.container.findFirst({ where: { id: data.containerId, organizationId: ctx.org.id } });
    if (!c) throw new NotFoundError("Container");
    const rule = RULES[data.action];
    if (!(rule.from as readonly ContainerStatus[]).includes(c.status)) throw new InvalidTransitionError("Container", c.status, rule.to);

    let locationId: string | null = c.serviceLocationId;
    if (data.action === "deliver") {
      if (!data.serviceLocationId) throw new DomainError("errors.validation", { fields: { serviceLocationId: "required" } });
      const loc = await tx.serviceLocation.findFirst({ where: { id: data.serviceLocationId, organizationId: ctx.org.id, active: true } });
      if (!loc) throw new NotFoundError("ServiceLocation");
      locationId = loc.id;
    }
    if (data.workOrderId) {
      const wo = await tx.workOrder.findFirst({ where: { id: data.workOrderId, organizationId: ctx.org.id } });
      if (!wo) throw new NotFoundError("WorkOrder");
    }
    const atCustomer = rule.to === "AT_CUSTOMER";
    await tx.container.update({
      where: { id: c.id },
      data: { status: rule.to, serviceLocationId: atCustomer ? locationId : null, placedAt: atCustomer ? new Date() : null },
    });
    await tx.containerMovement.create({
      data: { organizationId: ctx.org.id, containerId: c.id, kind: rule.kind, serviceLocationId: locationId, workOrderId: data.workOrderId ?? null, actorUserId: ctx.userId, notes: data.notes },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: `container.${data.action}`, entityType: "Container", entityId: c.id, data: { locationId, workOrderId: data.workOrderId ?? null } });
    return rule.to;
  });
}

/** Days each container has been at its current customer site — for rental billing and recovery. */
export function daysOnSite(placedAt: Date | null, now = new Date()) {
  return placedAt ? Math.floor((now.getTime() - placedAt.getTime()) / 86400_000) : null;
}
