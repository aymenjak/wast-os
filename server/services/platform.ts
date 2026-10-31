import { z } from "zod";
import { prisma } from "../db";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { dateOnly, email, isoDate, money, parse, requiredText } from "../validation";
import { containsInsensitive, pageOf, type TableState } from "../table";
import { toMinor } from "@/lib/money";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PlatformRole } from "@/lib/generated/prisma/enums";

/**
 * Platform operator console (the company running NEXVO).
 *
 * Roles: OWNER (everything, incl. plans and staff) > ADMIN (tenants, subscriptions, users) > SUPPORT (support console only).
 * The operator manages ACCOUNTS and METADATA (organization profile, subscription, members' names/emails, counts).
 * It does not read tenants' business records (customers, invoices, evidence): that needs the tenant's own
 * time-limited support grant (see services/support.ts). Every action is audited; tenant-related actions are
 * written to the tenant's audit log so the tenant can see them.
 */
const RANK: Record<PlatformRole, number> = { SUPPORT: 1, ADMIN: 2, OWNER: 3 };

export async function requirePlatform(userId: string, min: PlatformRole) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.platformRole || u.disabledAt || RANK[u.platformRole] < RANK[min]) throw new ForbiddenError(`platform.${min.toLowerCase()}`);
  return u;
}

export async function platformRoleOf(userId: string): Promise<PlatformRole | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { platformRole: true, disabledAt: true } });
  return u && !u.disabledAt ? u.platformRole : null;
}

// ── Overview ──

export async function platformOverview(userId: string) {
  await requirePlatform(userId, "ADMIN");
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400_000);
  const since30 = new Date(now.getTime() - 30 * 86400_000);
  const [byKind, suspended, pendingVerification, users, subs, trialsEnding, openTickets, activeGrants, signups30, recent] = await Promise.all([
    prisma.organization.groupBy({ by: ["kind"], _count: true }),
    prisma.organization.count({ where: { suspendedAt: { not: null } } }),
    prisma.organization.count({ where: { kind: "MUNICIPALITY", verificationStatus: { in: ["UNVERIFIED", "PENDING"] } } }),
    prisma.user.count({ where: { disabledAt: null } }),
    prisma.subscription.findMany({ select: { status: true, planCode: true, plan: { select: { priceMonthly: true } } } }),
    prisma.subscription.count({ where: { status: "TRIAL", currentPeriodEnd: { gte: now, lte: in7 } } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "WAITING_SUPPORT"] } } }),
    prisma.supportAccessGrant.count({ where: { revokedAt: null, expiresAt: { gt: now } } }),
    prisma.organization.count({ where: { createdAt: { gte: since30 } } }),
    prisma.organization.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { subscription: true } }),
  ]);
  const byStatus: Record<string, number> = {};
  const byPlan: Record<string, number> = {};
  let listMrrMinor = 0;
  for (const s of subs) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    if (s.status === "ACTIVE") {
      byPlan[s.planCode] = (byPlan[s.planCode] ?? 0) + 1;
      listMrrMinor += toMinor(s.plan.priceMonthly);
    }
  }
  return {
    tenants: Object.fromEntries(byKind.map((k) => [k.kind, k._count])) as Partial<Record<"SERVICE_PROVIDER" | "MUNICIPALITY", number>>,
    suspended, pendingVerification, users, byStatus, byPlan, listMrrMinor, trialsEnding, openTickets, activeGrants, signups30, recent,
  };
}

// ── Tenants ──

export const TENANT_SORTS = ["name", "createdAt"] as const;

export async function listTenants(userId: string, s: TableState<(typeof TENANT_SORTS)[number]>) {
  await requirePlatform(userId, "ADMIN");
  const c = s.q ? containsInsensitive(s.q) : null;
  const filters: Record<string, Prisma.OrganizationWhereInput> = {
    SERVICE_PROVIDER: { kind: "SERVICE_PROVIDER" },
    MUNICIPALITY: { kind: "MUNICIPALITY" },
    SUSPENDED: { suspendedAt: { not: null } },
    TRIAL: { subscription: { status: "TRIAL" } },
    PAST_DUE: { subscription: { status: "PAST_DUE" } },
    UNVERIFIED: { kind: "MUNICIPALITY", verificationStatus: { in: ["UNVERIFIED", "PENDING"] } },
  };
  const where: Prisma.OrganizationWhereInput = {
    ...(s.filter && filters[s.filter] ? filters[s.filter] : {}),
    ...(c ? { OR: [{ name: c }, { slug: c }, { email: c }, { wilaya: c }, { taxId: c }, { memberships: { some: { user: { email: c } } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.organization.findMany({
      where, orderBy: [{ [s.sort]: s.dir }, { id: "asc" }], skip: (s.page - 1) * s.pageSize, take: s.pageSize,
      include: { subscription: true, _count: { select: { memberships: true } } },
    }),
    prisma.organization.count({ where }),
  ]);
  return pageOf(rows, total, s);
}

export async function getTenant(userId: string, orgId: string) {
  await requirePlatform(userId, "ADMIN");
  const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { subscription: { include: { plan: true } } } });
  if (!org) throw new NotFoundError("Organization");
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const [members, customers, vehicles, workOrders30, invoices, civic30, lastActivity, grants, tickets, log] = await Promise.all([
    prisma.membership.findMany({ where: { organizationId: orgId }, include: { user: { select: { id: true, name: true, email: true, disabledAt: true, lockedUntil: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.customer.count({ where: { organizationId: orgId } }),
    prisma.vehicle.count({ where: { organizationId: orgId } }),
    prisma.workOrder.count({ where: { organizationId: orgId, createdAt: { gte: since30 } } }),
    prisma.invoice.count({ where: { organizationId: orgId, status: { not: "DRAFT" } } }),
    prisma.civicReport.count({ where: { organizationId: orgId, createdAt: { gte: since30 } } }),
    prisma.auditEvent.findFirst({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.supportAccessGrant.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.supportTicket.findMany({ where: { organizationId: orgId }, orderBy: { updatedAt: "desc" }, take: 5 }),
    prisma.auditEvent.findMany({ where: { organizationId: orgId, action: { startsWith: "platform." } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return {
    org, members, usage: { customers, vehicles, workOrders30, invoices, civic30 }, lastActivity: lastActivity?.createdAt ?? null,
    grants, tickets, log, names: await names(log.map((l) => l.actorUserId)),
  };
}

async function names(ids: (string | null)[]) {
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(ids.filter((x): x is string => !!x))] } }, select: { id: true, name: true } });
  return Object.fromEntries(users.map((u) => [u.id, u.name]));
}

async function tenantOrThrow(orgId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, include: { subscription: true } });
  if (!org) throw new NotFoundError("Organization");
  return org;
}

export async function setVerification(userId: string, orgId: string, input: unknown) {
  await requirePlatform(userId, "ADMIN");
  const { status } = parse(z.object({ status: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]) }), input);
  const org = await tenantOrThrow(orgId);
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: org.id }, data: { verificationStatus: status } });
    await audit(tx, { organizationId: org.id, actorUserId: userId, action: "platform.verification_changed", entityType: "Organization", entityId: org.id, data: { from: org.verificationStatus, to: status } });
  });
}

const subscriptionSchema = z.object({
  planCode: requiredText(32),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"]),
  currentPeriodEnd: isoDate,
});

/** Manual subscription management (no automatic billing of the platform itself yet). */
export async function changeSubscription(userId: string, orgId: string, input: unknown) {
  await requirePlatform(userId, "ADMIN");
  const data = parse(subscriptionSchema, input);
  const org = await tenantOrThrow(orgId);
  if (!(await prisma.plan.findUnique({ where: { code: data.planCode } }))) throw new DomainError("errors.validation", { fields: { planCode: "errors.validation" } });
  const end = dateOnly(data.currentPeriodEnd);
  await prisma.$transaction(async (tx) => {
    const before = org.subscription;
    await tx.subscription.upsert({
      where: { organizationId: org.id },
      create: { organizationId: org.id, planCode: data.planCode, status: data.status, currentPeriodEnd: end },
      update: { planCode: data.planCode, status: data.status, currentPeriodEnd: end },
    });
    await audit(tx, {
      organizationId: org.id, actorUserId: userId, action: "platform.subscription_changed", entityType: "Organization", entityId: org.id,
      data: { from: before ? { plan: before.planCode, status: before.status, end: before.currentPeriodEnd.toISOString().slice(0, 10) } : null, to: { plan: data.planCode, status: data.status, end: data.currentPeriodEnd } },
    });
  });
}

/** Suspension blocks members' access (data kept, reversible). Live sessions lose the workspace on their next request. */
export async function suspendTenant(userId: string, orgId: string, input: unknown) {
  await requirePlatform(userId, "ADMIN");
  const { reason } = parse(z.object({ reason: requiredText(300) }), input);
  const org = await tenantOrThrow(orgId);
  if (org.suspendedAt) throw new DomainError("errors.platform.alreadySuspended");
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: org.id }, data: { suspendedAt: new Date(), suspendedReason: reason } });
    await audit(tx, { organizationId: org.id, actorUserId: userId, action: "platform.tenant_suspended", entityType: "Organization", entityId: org.id, data: { reason } });
  });
}

export async function reactivateTenant(userId: string, orgId: string) {
  await requirePlatform(userId, "ADMIN");
  const org = await tenantOrThrow(orgId);
  if (!org.suspendedAt) throw new DomainError("errors.platform.notSuspended");
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({ where: { id: org.id }, data: { suspendedAt: null, suspendedReason: null } });
    await audit(tx, { organizationId: org.id, actorUserId: userId, action: "platform.tenant_reactivated", entityType: "Organization", entityId: org.id });
  });
}

// ── Plans (OWNER) ──

export async function listPlans(userId: string) {
  await requirePlatform(userId, "ADMIN");
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { subscriptions: true } } } });
  return plans;
}

const limit = z.coerce.number().int().min(-1).max(1_000_000);
const planSchema = z.object({
  name: requiredText(60),
  priceMonthly: money,
  priceYearly: money,
  maxUsers: limit,
  maxVehicles: limit,
  maxCustomers: limit,
  customerPortal: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  advancedReports: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  isPublic: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

/** Price and limit changes apply to every subscriber of the plan; OWNER only. */
export async function updatePlan(userId: string, code: string, input: unknown) {
  await requirePlatform(userId, "OWNER");
  const data = parse(planSchema, input);
  const plan = await prisma.plan.findUnique({ where: { code } });
  if (!plan) throw new NotFoundError("Plan");
  await prisma.$transaction(async (tx) => {
    await tx.plan.update({ where: { code }, data });
    await audit(tx, {
      organizationId: null, actorUserId: userId, action: "platform.plan_updated", entityType: "Plan", entityId: code,
      data: { from: { priceMonthly: plan.priceMonthly.toString(), maxUsers: plan.maxUsers, maxVehicles: plan.maxVehicles, maxCustomers: plan.maxCustomers }, to: { priceMonthly: data.priceMonthly, maxUsers: data.maxUsers, maxVehicles: data.maxVehicles, maxCustomers: data.maxCustomers } },
    });
  });
}

// ── Staff and user accounts ──

export async function listStaff(userId: string) {
  await requirePlatform(userId, "ADMIN");
  return prisma.user.findMany({ where: { platformRole: { not: null } }, select: { id: true, name: true, email: true, platformRole: true, disabledAt: true }, orderBy: { email: "asc" } });
}

/** OWNER grants or removes platform roles. The last active OWNER cannot be removed or demoted, nor can owners change themselves. */
export async function setStaffRole(userId: string, input: unknown) {
  await requirePlatform(userId, "OWNER");
  const data = parse(z.object({ email, role: z.enum(["OWNER", "ADMIN", "SUPPORT", "NONE"]) }), input);
  const target = await prisma.user.findUnique({ where: { email: data.email } });
  if (!target) throw new DomainError("errors.platform.userNotFound");
  if (target.id === userId) throw new DomainError("errors.platform.notSelf");
  const role = data.role === "NONE" ? null : data.role;
  await prisma.$transaction(async (tx) => {
    if (target.platformRole === "OWNER" && role !== "OWNER") {
      const owners = await tx.user.count({ where: { platformRole: "OWNER", disabledAt: null } });
      if (owners <= 1) throw new DomainError("errors.platform.lastOwner");
    }
    await tx.user.update({ where: { id: target.id }, data: { platformRole: role, isPlatformStaff: role !== null } });
    if (!role) await tx.session.updateMany({ where: { userId: target.id, supportGrantId: { not: null } }, data: { supportGrantId: null, activeOrganizationId: null } });
    await audit(tx, { organizationId: null, actorUserId: userId, action: "platform.staff_role_changed", entityType: "User", entityId: target.id, data: { from: target.platformRole, to: role } });
  });
}

export async function findUserAccount(userId: string, q: string) {
  await requirePlatform(userId, "ADMIN");
  const term = q.trim();
  if (term.length < 3) return [];
  return prisma.user.findMany({
    where: { email: containsInsensitive(term) },
    select: { id: true, name: true, email: true, disabledAt: true, lockedUntil: true, platformRole: true, createdAt: true, memberships: { select: { role: true, status: true, organization: { select: { id: true, name: true } } } } },
    take: 20,
    orderBy: { email: "asc" },
  });
}

/** Disable (all sessions revoked) / enable / unlock an account. Owners can only be disabled by another owner. */
export async function setUserAccess(userId: string, targetId: string, input: unknown) {
  const actor = await requirePlatform(userId, "ADMIN");
  const { action } = parse(z.object({ action: z.enum(["disable", "enable", "unlock"]) }), input);
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFoundError("User");
  if (target.id === userId) throw new DomainError("errors.platform.notSelf");
  if (target.platformRole && RANK[target.platformRole] >= RANK[actor.platformRole!] && actor.platformRole !== "OWNER") throw new ForbiddenError("platform.owner");
  if (action === "disable" && target.platformRole === "OWNER" && (await prisma.user.count({ where: { platformRole: "OWNER", disabledAt: null } })) <= 1) {
    throw new DomainError("errors.platform.lastOwner");
  }
  await prisma.$transaction(async (tx) => {
    if (action === "disable") {
      await tx.user.update({ where: { id: target.id }, data: { disabledAt: new Date() } });
      await tx.session.deleteMany({ where: { userId: target.id } });
    } else if (action === "enable") {
      await tx.user.update({ where: { id: target.id }, data: { disabledAt: null } });
    } else {
      await tx.user.update({ where: { id: target.id }, data: { lockedUntil: null, failedLogins: 0 } });
    }
    await audit(tx, { organizationId: null, actorUserId: userId, action: `platform.user_${action}d`, entityType: "User", entityId: target.id });
  });
}

// ── Audit ──

export async function platformAudit(userId: string) {
  await requirePlatform(userId, "ADMIN");
  const events = await prisma.auditEvent.findMany({
    where: { OR: [{ action: { startsWith: "platform." } }, { action: { startsWith: "support." } }, { action: "user.locked" }] },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { organization: { select: { id: true, name: true } } },
  });
  return { events, names: await names(events.map((e) => e.actorUserId)) };
}
