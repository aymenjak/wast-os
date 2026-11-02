import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { enforcePlanLimit } from "./accounts";
import { dateOnly, isoDate, money, optionalText, parse, requiredText } from "../validation";

const vehicleSchema = z.object({
  plateNumber: z.string().trim().min(2).max(20).transform((s) => s.toUpperCase()),
  label: requiredText(80),
  type: z.enum(["COMPACTOR", "TIPPER", "SKIP_LOADER", "HOOK_LIFT", "VAN", "OTHER"]),
  capacityKg: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().positive().max(100_000).optional()),
  restrictions: optionalText(500),
  odometerKm: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).optional()),
});

export async function listVehicles(ctx: OrgContext) {
  requirePermission(ctx, "fleet.read");
  const since = new Date(Date.now() - 30 * 86400_000);
  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId: ctx.org.id },
    include: {
      maintenance: { orderBy: { performedAt: "desc" }, take: 1 },
      _count: { select: { workOrders: { where: { status: "COMPLETED", scheduledDate: { gte: since } } } } },
    },
    orderBy: { plateNumber: "asc" },
  });
  return vehicles;
}

export async function getVehicle(ctx: OrgContext, vehicleId: string) {
  requirePermission(ctx, "fleet.read");
  const v = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId: ctx.org.id },
    include: {
      maintenance: { orderBy: { performedAt: "desc" } },
      workOrders: { orderBy: { scheduledDate: "desc" }, take: 20, include: { customer: { select: { name: true } }, team: { select: { name: true } } } },
    },
  });
  if (!v) throw new NotFoundError("Vehicle");
  return v;
}

export async function createVehicle(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const data = parse(vehicleSchema, input);
  await enforcePlanLimit(ctx, "vehicles");
  return prisma.$transaction(async (tx) => {
    if (await tx.vehicle.findFirst({ where: { organizationId: ctx.org.id, plateNumber: data.plateNumber } }))
      throw new DomainError("errors.fleet.plateTaken");
    const v = await tx.vehicle.create({ data: { ...data, organizationId: ctx.org.id } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "vehicle.created", entityType: "Vehicle", entityId: v.id });
    return v;
  });
}

export async function setVehicleStatus(ctx: OrgContext, vehicleId: string, status: "AVAILABLE" | "IN_SERVICE" | "MAINTENANCE" | "RETIRED") {
  requirePermission(ctx, "fleet.write");
  await prisma.$transaction(async (tx) => {
    const r = await tx.vehicle.updateMany({ where: { id: vehicleId, organizationId: ctx.org.id }, data: { status } });
    if (r.count === 0) throw new NotFoundError("Vehicle");
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "vehicle.status_changed", entityType: "Vehicle", entityId: vehicleId, data: { status } });
  });
}

const maintenanceSchema = z.object({
  kind: z.enum(["MAINTENANCE", "INSPECTION", "REPAIR"]),
  performedAt: isoDate,
  description: requiredText(1000),
  cost: z.preprocess((v) => (v === "" ? undefined : v), money.optional()),
  odometerKm: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).optional()),
  nextDueAt: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
});

export async function addMaintenance(ctx: OrgContext, vehicleId: string, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const data = parse(maintenanceSchema, input);
  return prisma.$transaction(async (tx) => {
    const v = await tx.vehicle.findFirst({ where: { id: vehicleId, organizationId: ctx.org.id } });
    if (!v) throw new NotFoundError("Vehicle");
    const rec = await tx.vehicleMaintenance.create({
      data: {
        organizationId: ctx.org.id,
        vehicleId: v.id,
        kind: data.kind,
        performedAt: dateOnly(data.performedAt),
        description: data.description,
        cost: data.cost,
        odometerKm: data.odometerKm,
        nextDueAt: data.nextDueAt ? dateOnly(data.nextDueAt) : null,
        recordedById: ctx.userId,
      },
    });
    if (data.odometerKm && (!v.odometerKm || data.odometerKm > v.odometerKm)) {
      await tx.vehicle.update({ where: { id: v.id }, data: { odometerKm: data.odometerKm } });
    }
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "vehicle.maintenance_logged", entityType: "Vehicle", entityId: v.id, data: { kind: data.kind } });
    return rec;
  });
}

// ───────────── Teams ─────────────

export async function listTeams(ctx: OrgContext) {
  requirePermission(ctx, "fleet.read");
  return prisma.team.findMany({
    where: { organizationId: ctx.org.id },
    include: { members: { include: { membership: { include: { user: { select: { name: true } } } } } } },
    orderBy: { name: "asc" },
  });
}

export async function createTeam(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const { name } = parse(z.object({ name: requiredText(80) }), input);
  if (await prisma.team.findFirst({ where: { organizationId: ctx.org.id, name } })) throw new DomainError("errors.fleet.teamTaken");
  const team = await prisma.team.create({ data: { organizationId: ctx.org.id, name } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "fleet.team_created", entityType: "Team", entityId: team.id });
  return team;
}

export async function addTeamMember(ctx: OrgContext, teamId: string, membershipId: string) {
  requirePermission(ctx, "fleet.write");
  const [team, m] = await Promise.all([
    prisma.team.findFirst({ where: { id: teamId, organizationId: ctx.org.id } }),
    prisma.membership.findFirst({ where: { id: membershipId, organizationId: ctx.org.id, status: "ACTIVE", role: { not: "CUSTOMER_PORTAL" } } }),
  ]);
  if (!team) throw new NotFoundError("Team");
  if (!m) throw new NotFoundError("Membership");
  await prisma.teamMember.upsert({
    where: { teamId_membershipId: { teamId, membershipId } },
    create: { teamId, membershipId },
    update: {},
  });
  // Team membership decides which work orders a field worker can see: traced.
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "fleet.team_member_added", entityType: "Team", entityId: teamId, data: { membershipId } });
}

export async function removeTeamMember(ctx: OrgContext, teamId: string, membershipId: string) {
  requirePermission(ctx, "fleet.write");
  const team = await prisma.team.findFirst({ where: { id: teamId, organizationId: ctx.org.id } });
  if (!team) throw new NotFoundError("Team");
  await prisma.teamMember.deleteMany({ where: { teamId, membershipId } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "fleet.team_member_removed", entityType: "Team", entityId: teamId, data: { membershipId } });
}

export async function staffOptions(ctx: OrgContext) {
  requirePermission(ctx, "fleet.read");
  return prisma.membership.findMany({
    where: { organizationId: ctx.org.id, status: "ACTIVE", role: { not: "CUSTOMER_PORTAL" } },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
}
