import { z } from "zod";
import { prisma, type Db } from "../db";
import { hashPassword, verifyPassword, getDummyHash } from "../auth/password";
import { hashToken, newToken } from "../auth/tokens";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { assignableRoles } from "../domain/permissions";
import { buildContext, requirePermission, type OrgContext } from "../context";
import { audit } from "../audit";
import { email, parse, password, requiredText, optionalText } from "../validation";
import { DEFAULT_WASTE_CATEGORIES } from "../reference-data";
import type { OrgRole } from "@/lib/generated/prisma/enums";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 30;
/** Lock an account for 15 minutes after 5 consecutive failed logins. */
export const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MS = 15 * 60_000;

const registerSchema = z.object({
  organizationName: requiredText(120),
  kind: z.enum(["SERVICE_PROVIDER", "MUNICIPALITY"]).default("SERVICE_PROVIDER"),
  wilaya: optionalText(80),
  name: requiredText(120),
  email,
  password,
  locale: z.enum(["ar", "fr", "en"]).default("fr"),
  // Law 18-07: the person creating the workspace accepts the privacy notice (/privacy) explicitly.
  acceptPrivacy: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean().refine((v) => v, "privacyConsent")),
});

function slugify(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "org";
}

async function uniqueSlug(db: Db, name: string) {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await db.organization.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${newToken().slice(0, 6).toLowerCase()}`;
}

export async function createOrganizationRecords(
  db: Db,
  input: { name: string; kind: "SERVICE_PROVIDER" | "MUNICIPALITY"; wilaya?: string; locale: string; ownerUserId: string },
) {
  const org = await db.organization.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(db, input.name),
      kind: input.kind,
      wilaya: input.wilaya,
      defaultLocale: input.locale,
      memberships: { create: { userId: input.ownerUserId, role: "OWNER" } },
      wasteCategories: { create: DEFAULT_WASTE_CATEGORIES.map((c) => ({ ...c })) },
    },
  });
  if (input.kind === "SERVICE_PROVIDER") {
    const plan = await db.plan.findFirst({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } });
    if (plan) {
      await db.subscription.create({
        data: {
          organizationId: org.id,
          planCode: plan.code,
          status: "TRIAL",
          currentPeriodEnd: new Date(Date.now() + TRIAL_DAYS * 86400_000),
        },
      });
    }
  }
  return org;
}

/** Self-service sign-up: creates the user, the organization, the owner membership and a session. */
export async function registerOrganization(input: unknown, meta: { userAgent?: string } = {}) {
  const data = parse(registerSchema, input);
  const passwordHash = await hashPassword(data.password);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) throw new DomainError("errors.auth.emailTaken");
    const user = await tx.user.create({
      data: { email: data.email, name: data.name, passwordHash, locale: data.locale },
    });
    const org = await createOrganizationRecords(tx, {
      name: data.organizationName,
      kind: data.kind,
      wilaya: data.wilaya,
      locale: data.locale,
      ownerUserId: user.id,
    });
    await audit(tx, { organizationId: org.id, actorUserId: user.id, action: "organization.created", entityType: "Organization", entityId: org.id });
    const token = await createSessionRecord(tx, user.id, org.id, meta.userAgent);
    return { user, org, token };
  });
}

export async function createSessionRecord(db: Db, userId: string, activeOrganizationId: string | null, userAgent?: string) {
  const token = newToken();
  await db.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      activeOrganizationId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: userAgent?.slice(0, 300),
    },
  });
  return token;
}

const loginSchema = z.object({ email, password: z.string().min(1).max(200) });

/** Returns a session token, or throws a generic error that does not reveal whether the email exists. */
export async function login(input: unknown, meta: { userAgent?: string } = {}) {
  const data = parse(loginSchema, input);
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { memberships: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  // Locked accounts still run a full hash comparison so timing does not reveal the lock.
  const locked = !!user?.lockedUntil && user.lockedUntil > new Date();
  const ok = await verifyPassword(data.password, user?.passwordHash ?? (await getDummyHash()));
  if (user && !ok && !locked) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: failed >= LOCKOUT_THRESHOLD ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) } : { failedLogins: failed },
    });
    if (failed >= LOCKOUT_THRESHOLD) await audit(prisma, { organizationId: null, actorType: "SYSTEM", action: "user.locked", entityType: "User", entityId: user.id });
  }
  if (!user || !ok || locked || user.disabledAt) throw new DomainError("errors.auth.invalidCredentials");
  if (user.failedLogins > 0 || user.lockedUntil) await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  // Two-factor users get a short-lived challenge instead of a session.
  if (user.totpEnabledAt) {
    const { createLoginChallenge } = await import("./mfa");
    return { token: null, challengeToken: await createLoginChallenge(user.id, meta.userAgent), user };
  }
  const token = await createSessionRecord(prisma, user.id, user.memberships[0]?.organizationId ?? null, meta.userAgent);
  return { token, challengeToken: null, user };
}

export async function logout(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Resolves a session token to the user and (optionally) an organization context. */
export async function resolveSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabledAt) return null;
  // Sliding expiration, written at most once per hour.
  if (Date.now() - session.lastSeenAt.getTime() > 3600_000) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
  }
  let ctx: OrgContext | null = null;
  let suspended = false;
  if (session.supportGrantId) ctx = await loadSupportContext(session.user, session.supportGrantId, session.id);
  else if (session.activeOrganizationId) {
    ctx = await loadContext(session.user.id, session.activeOrganizationId);
    if (!ctx) suspended = !!(await prisma.organization.findUnique({ where: { id: session.activeOrganizationId }, select: { suspendedAt: true } }))?.suspendedAt;
  }
  return { session, user: session.user, ctx, suspended };
}

export async function loadContext(userId: string, organizationId: string): Promise<OrgContext | null> {
  const m = await prisma.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { organization: true, user: true },
  });
  if (!m || m.status !== "ACTIVE") return null;
  const o = m.organization;
  // Suspended by the platform operator: no member access until reactivated.
  if (o.suspendedAt) return null;
  return buildContext({
    userId,
    userName: m.user.name,
    membershipId: m.id,
    role: m.role,
    customerId: m.customerId,
    org: {
      id: o.id,
      slug: o.slug,
      name: o.name,
      kind: o.kind,
      timezone: o.timezone,
      currency: o.currency,
      defaultTaxRateBps: o.defaultTaxRateBps,
      civicSlaHours: o.civicSlaHours,
    },
  });
}

/**
 * Read-only context for NEXVO staff inside a customer workspace. Valid only while the grant is
 * active and the user is still platform staff; otherwise the support session is cleared.
 */
async function loadSupportContext(user: { id: string; name: string; isPlatformStaff: boolean; totpEnabledAt: Date | null }, grantId: string, sessionId: string): Promise<OrgContext | null> {
  const grant = await prisma.supportAccessGrant.findUnique({ where: { id: grantId }, include: { organization: true } });
  if (!user.isPlatformStaff || !user.totpEnabledAt || !grant || grant.revokedAt || grant.expiresAt <= new Date()) {
    await prisma.session.update({ where: { id: sessionId }, data: { supportGrantId: null, activeOrganizationId: null } });
    return null;
  }
  const o = grant.organization;
  return {
    ...buildContext({
      userId: user.id,
      userName: user.name,
      membershipId: `support:${grant.id}`,
      role: "VIEWER",
      customerId: null,
      org: { id: o.id, slug: o.slug, name: o.name, kind: o.kind, timezone: o.timezone, currency: o.currency, defaultTaxRateBps: o.defaultTaxRateBps, civicSlaHours: o.civicSlaHours },
    }),
    support: { grantId: grant.id, expiresAt: grant.expiresAt },
  };
}

export async function listUserOrganizations(userId: string) {
  return prisma.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: { organization: { select: { id: true, name: true, kind: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function switchOrganization(token: string, userId: string, organizationId: string) {
  const ctx = await loadContext(userId, organizationId);
  if (!ctx) throw new ForbiddenError();
  await prisma.session.updateMany({ where: { tokenHash: hashToken(token), userId }, data: { activeOrganizationId: organizationId } });
}

// ───────────── Organization settings ─────────────

const settingsSchema = z.object({
  name: requiredText(120),
  legalName: optionalText(200),
  taxId: optionalText(40),
  statisticalId: optionalText(40),
  tradeRegister: optionalText(40),
  address: optionalText(300),
  wilaya: optionalText(80),
  commune: optionalText(80),
  phone: optionalText(40),
  email: z.preprocess((v) => (v === "" ? undefined : v), email.optional()),
  defaultTaxRateBps: z.coerce.number().int().min(0).max(10000),
  invoicePrefix: z.string().trim().regex(/^[A-Z0-9]{2,8}$/),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }),
  civicSlaHours: z.coerce.number().int().min(1).max(24 * 60).optional(),
});

export async function getOrganization(ctx: OrgContext) {
  return prisma.organization.findUniqueOrThrow({
    where: { id: ctx.org.id },
    include: { subscription: { include: { plan: true } } },
  });
}

export async function updateOrganizationSettings(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "settings.manage");
  const data = parse(settingsSchema, input);
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({ where: { id: ctx.org.id }, data });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "organization.settings_updated", entityType: "Organization", entityId: ctx.org.id });
    return org;
  });
}

// ───────────── Team & invitations ─────────────

export async function listMembers(ctx: OrgContext) {
  requirePermission(ctx, "team.manage");
  const [members, invitations] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: ctx.org.id },
      include: { user: { select: { name: true, email: true } }, customer: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId: ctx.org.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { members, invitations };
}

const inviteSchema = z.object({
  email,
  role: z.enum(["ADMIN", "DISPATCHER", "FIELD_WORKER", "FINANCE", "VIEWER", "CIVIC_REVIEWER", "CUSTOMER_PORTAL"]),
  customerId: optionalText(64),
});

/**
 * Creates an invitation and returns the one-time token. The token is queued in the
 * notification outbox for email delivery and shown once to the inviter as a fallback link.
 */
export async function inviteMember(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "team.manage");
  const data = parse(inviteSchema, input);
  if (!assignableRoles(ctx.org.kind).includes(data.role)) throw new DomainError("errors.team.roleNotAllowed");
  if (data.role === "ADMIN" && ctx.role !== "OWNER") throw new ForbiddenError("team.grantAdmin");
  if (data.role === "CUSTOMER_PORTAL") {
    if (!data.customerId) throw new DomainError("errors.validation", { fields: { customerId: "required" } });
    const c = await prisma.customer.findFirst({ where: { id: data.customerId, organizationId: ctx.org.id } });
    if (!c) throw new NotFoundError("Customer");
  }
  await enforcePlanLimit(ctx, "users");
  const token = newToken();
  const inv = await prisma.$transaction(async (tx) => {
    const existingMember = await tx.membership.findFirst({
      where: { organizationId: ctx.org.id, user: { email: data.email } },
    });
    if (existingMember) throw new DomainError("errors.team.alreadyMember");
    const invitation = await tx.invitation.create({
      data: {
        organizationId: ctx.org.id,
        email: data.email,
        role: data.role,
        customerId: data.role === "CUSTOMER_PORTAL" ? data.customerId : null,
        tokenHash: hashToken(token),
        invitedById: ctx.userId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });
    const { enqueueEmail } = await import("./mailer");
    const { invitationEmail } = await import("../email/templates");
    const org = await tx.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { defaultLocale: true } });
    const m = invitationEmail(org.defaultLocale, ctx.org.name, `${process.env.APP_URL ?? ""}/${org.defaultLocale}/invite/${token}`);
    await enqueueEmail(tx, { organizationId: ctx.org.id, to: data.email, type: "invitation", sensitive: true, ...m });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "member.invited", entityType: "Invitation", entityId: invitation.id, data: { email: data.email, role: data.role } });
    return invitation;
  });
  return { invitation: inv, token };
}

export async function revokeInvitation(ctx: OrgContext, invitationId: string) {
  requirePermission(ctx, "team.manage");
  const r = await prisma.invitation.updateMany({
    where: { id: invitationId, organizationId: ctx.org.id, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (r.count === 0) throw new NotFoundError("Invitation");
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "member.invitation_revoked", entityType: "Invitation", entityId: invitationId });
}

export async function getInvitationByToken(token: string) {
  const inv = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { name: true } } },
  });
  if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt < new Date()) return null;
  const userExists = !!(await prisma.user.findUnique({ where: { email: inv.email }, select: { id: true } }));
  return { email: inv.email, role: inv.role, organizationName: inv.organization.name, userExists };
}

const acceptSchema = z.object({ token: z.string().min(20).max(100), name: optionalText(120), password: z.string().min(1).max(200) });

/** Accepts an invitation for a new or existing account (existing accounts must prove their password). */
export async function acceptInvitation(input: unknown, meta: { userAgent?: string } = {}) {
  const data = parse(acceptSchema, input);
  return prisma.$transaction(async (tx) => {
    const inv = await tx.invitation.findUnique({ where: { tokenHash: hashToken(data.token) } });
    if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt < new Date()) throw new DomainError("errors.team.invitationInvalid");
    let user = await tx.user.findUnique({ where: { email: inv.email } });
    if (user) {
      if (!(await verifyPassword(data.password, user.passwordHash))) throw new DomainError("errors.auth.invalidCredentials");
    } else {
      parse(z.object({ password, name: requiredText(120) }), data);
      user = await tx.user.create({
        data: { email: inv.email, name: data.name!, passwordHash: await hashPassword(data.password) },
      });
    }
    await tx.membership.create({
      data: { organizationId: inv.organizationId, userId: user.id, role: inv.role, customerId: inv.customerId },
    });
    // Conditional update guards against two concurrent acceptances of the same token.
    const claimed = await tx.invitation.updateMany({ where: { id: inv.id, acceptedAt: null }, data: { acceptedAt: new Date() } });
    if (claimed.count !== 1) throw new DomainError("errors.team.invitationInvalid");
    await audit(tx, { organizationId: inv.organizationId, actorUserId: user.id, action: "member.joined", entityType: "Membership", entityId: user.id, data: { role: inv.role } });
    const token = await createSessionRecord(tx, user.id, inv.organizationId, meta.userAgent);
    return { token, user, organizationId: inv.organizationId };
  });
}

const roleSchema = z.object({ membershipId: z.string().min(1), role: z.enum(["ADMIN", "DISPATCHER", "FIELD_WORKER", "FINANCE", "VIEWER", "CIVIC_REVIEWER"]) });

export async function changeMemberRole(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "team.manage");
  const data = parse(roleSchema, input);
  const m = await prisma.membership.findFirst({ where: { id: data.membershipId, organizationId: ctx.org.id } });
  if (!m) throw new NotFoundError("Membership");
  if (m.role === "OWNER" || m.role === "CUSTOMER_PORTAL") throw new DomainError("errors.team.roleNotAllowed");
  if (!assignableRoles(ctx.org.kind).includes(data.role as OrgRole)) throw new DomainError("errors.team.roleNotAllowed");
  if (data.role === "ADMIN" && ctx.role !== "OWNER") throw new ForbiddenError("team.grantAdmin");
  await prisma.$transaction([
    prisma.membership.update({ where: { id: m.id }, data: { role: data.role } }),
    prisma.auditEvent.create({ data: { organizationId: ctx.org.id, actorType: "USER", actorUserId: ctx.userId, action: "member.role_changed", entityType: "Membership", entityId: m.id, data: { from: m.role, to: data.role } } }),
  ]);
}

export async function setMemberStatus(ctx: OrgContext, membershipId: string, status: "ACTIVE" | "SUSPENDED") {
  requirePermission(ctx, "team.manage");
  const m = await prisma.membership.findFirst({ where: { id: membershipId, organizationId: ctx.org.id } });
  if (!m) throw new NotFoundError("Membership");
  if (m.role === "OWNER" || m.userId === ctx.userId) throw new DomainError("errors.team.cannotSuspend");
  await prisma.$transaction([
    prisma.membership.update({ where: { id: m.id }, data: { status } }),
    prisma.auditEvent.create({ data: { organizationId: ctx.org.id, actorType: "USER", actorUserId: ctx.userId, action: `member.${status.toLowerCase()}`, entityType: "Membership", entityId: m.id } }),
  ]);
}

// ───────────── Plan limits ─────────────

export async function enforcePlanLimit(ctx: OrgContext, resource: "users" | "vehicles" | "customers") {
  if (ctx.org.kind !== "SERVICE_PROVIDER") return;
  const sub = await prisma.subscription.findUnique({ where: { organizationId: ctx.org.id }, include: { plan: true } });
  if (!sub) return;
  if (sub.status === "CANCELLED") throw new DomainError("errors.plan.inactive");
  const [limit, used] =
    resource === "users"
      ? [sub.plan.maxUsers, (await prisma.membership.count({ where: { organizationId: ctx.org.id, role: { not: "CUSTOMER_PORTAL" } } })) + (await prisma.invitation.count({ where: { organizationId: ctx.org.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() }, role: { not: "CUSTOMER_PORTAL" } } }))]
      : resource === "vehicles"
        ? [sub.plan.maxVehicles, await prisma.vehicle.count({ where: { organizationId: ctx.org.id, status: { not: "RETIRED" } } })]
        : [sub.plan.maxCustomers, await prisma.customer.count({ where: { organizationId: ctx.org.id } })];
  if (limit >= 0 && used >= limit) throw new DomainError("errors.plan.limitReached", { resource, limit });
}
