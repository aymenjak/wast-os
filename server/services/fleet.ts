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
      documents: { orderBy: [{ kind: "asc" }, { expiresOn: "desc" }] },
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

// ───────────── Vehicle documents and expiry alerts ─────────────

export const VEHICLE_DOCUMENT_KINDS = ["INSURANCE", "TECHNICAL_INSPECTION", "REGISTRATION", "TRANSPORT_AUTHORISATION", "OTHER"] as const;
/** Alerts start this many days before a document or a maintenance falls due. */
export const FLEET_ALERT_DAYS = 30;

const documentSchema = z.object({
  kind: z.enum(VEHICLE_DOCUMENT_KINDS),
  reference: optionalText(80),
  issuer: optionalText(120),
  issuedOn: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
  expiresOn: z.preprocess((v) => (v === "" ? undefined : v), isoDate.optional()),
  notes: optionalText(500),
}).refine((d) => !d.issuedOn || !d.expiresOn || d.expiresOn >= d.issuedOn, { path: ["expiresOn"], message: "beforeIssue" });

/** Records a document (a renewal is a new record; the one with the latest expiry is the one in force). */
export async function addVehicleDocument(ctx: OrgContext, vehicleId: string, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const data = parse(documentSchema, input);
  return prisma.$transaction(async (tx) => {
    const v = await tx.vehicle.findFirst({ where: { id: vehicleId, organizationId: ctx.org.id }, select: { id: true } });
    if (!v) throw new NotFoundError("Vehicle");
    const doc = await tx.vehicleDocument.create({
      data: {
        organizationId: ctx.org.id, vehicleId: v.id, kind: data.kind, reference: data.reference ?? null, issuer: data.issuer ?? null,
        issuedOn: data.issuedOn ? dateOnly(data.issuedOn) : null, expiresOn: data.expiresOn ? dateOnly(data.expiresOn) : null,
        notes: data.notes ?? null, recordedById: ctx.userId,
      },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "vehicle.document_added", entityType: "Vehicle", entityId: v.id, data: { kind: data.kind, expiresOn: data.expiresOn ?? null } });
    return doc;
  });
}

export type FleetAlert = {
  vehicleId: string; plateNumber: string; label: string;
  kind: (typeof VEHICLE_DOCUMENT_KINDS)[number] | "MAINTENANCE";
  dueOn: string; daysLeft: number; expired: boolean;
};

/**
 * Documents in force that are expired or expire within FLEET_ALERT_DAYS, and maintenance due in that window, for vehicles
 * still in service (not RETIRED). `today` is the organization's day (ISO), passed by the caller.
 */
export async function fleetAlerts(ctx: OrgContext, today: string): Promise<FleetAlert[]> {
  requirePermission(ctx, "fleet.read");
  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId: ctx.org.id, status: { not: "RETIRED" } },
    select: {
      id: true, plateNumber: true, label: true,
      documents: { where: { expiresOn: { not: null } }, select: { kind: true, expiresOn: true } },
      maintenance: { orderBy: { performedAt: "desc" }, take: 1, select: { nextDueAt: true } },
    },
  });
  const t0 = Date.parse(`${today}T00:00:00Z`);
  const alerts: FleetAlert[] = [];
  const push = (v: (typeof vehicles)[number], kind: FleetAlert["kind"], due: Date) => {
    const daysLeft = Math.round((due.getTime() - t0) / 86_400_000);
    if (daysLeft <= FLEET_ALERT_DAYS) alerts.push({ vehicleId: v.id, plateNumber: v.plateNumber, label: v.label, kind, dueOn: due.toISOString().slice(0, 10), daysLeft, expired: daysLeft < 0 });
  };
  for (const v of vehicles) {
    const latest = new Map<string, Date>();
    for (const d of v.documents) if (!latest.has(d.kind) || d.expiresOn! > latest.get(d.kind)!) latest.set(d.kind, d.expiresOn!);
    for (const [kind, due] of latest) push(v, kind as FleetAlert["kind"], due);
    const next = v.maintenance[0]?.nextDueAt;
    if (next) push(v, "MAINTENANCE", next);
  }
  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
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
