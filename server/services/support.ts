import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { hashToken } from "../auth/tokens";
import { optionalText, parse, requiredText } from "../validation";
import type { TicketStatus } from "@/lib/generated/prisma/enums";

/**
 * Remote support. Design follows common SaaS practice (WorkOS delegated sessions, Ory, Tines, GoodData):
 *  - the CUSTOMER grants access (owner/admin), for a fixed short window, revocable at any time;
 *  - staff act under their OWN identity (never "log in as"), read-only (VIEWER permissions);
 *  - session start/end and every grant change are audited in the customer's own audit log.
 */
const GRANT_HOURS = [1, 4, 24] as const;

function assertMember(ctx: OrgContext) {
  if (ctx.role === "CUSTOMER_PORTAL" || ctx.support) throw new ForbiddenError("support.member");
}

// ── Customer side ──

const ticketSchema = z.object({
  subject: requiredText(160),
  category: z.enum(["QUESTION", "BUG", "BILLING", "ACCESS", "FEATURE"]).default("QUESTION"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  body: z.string().trim().min(5).max(5000),
});

export async function createTicket(ctx: OrgContext, input: unknown) {
  assertMember(ctx);
  const data = parse(ticketSchema, input);
  return prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, ctx.org.id, "ticket", "SUP", 4);
    const t = await tx.supportTicket.create({
      data: {
        organizationId: ctx.org.id, number, subject: data.subject, category: data.category, priority: data.priority, createdById: ctx.userId,
        messages: { create: { authorUserId: ctx.userId, body: data.body } },
      },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "support.ticket_opened", entityType: "SupportTicket", entityId: t.id, data: { number } });
    return t;
  });
}

export async function listTickets(ctx: OrgContext) {
  assertMember(ctx);
  return prisma.supportTicket.findMany({ where: { organizationId: ctx.org.id }, orderBy: { updatedAt: "desc" }, take: 100, include: { _count: { select: { messages: true } } } });
}

async function authorNames(ids: string[]) {
  const users = await prisma.user.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true } });
  return Object.fromEntries(users.map((u) => [u.id, u.name]));
}

export async function getTicket(ctx: OrgContext, id: string) {
  assertMember(ctx);
  const t = await prisma.supportTicket.findFirst({ where: { id, organizationId: ctx.org.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!t) throw new NotFoundError("SupportTicket");
  return { ...t, names: await authorNames(t.messages.map((m) => m.authorUserId)) };
}

export async function replyTicket(ctx: OrgContext, id: string, input: unknown) {
  assertMember(ctx);
  const { body } = parse(z.object({ body: z.string().trim().min(1).max(5000) }), input);
  const t = await prisma.supportTicket.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!t) throw new NotFoundError("SupportTicket");
  if (t.status === "CLOSED") throw new DomainError("errors.support.closed");
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId: t.id, authorUserId: ctx.userId, body } }),
    prisma.supportTicket.update({ where: { id: t.id }, data: { status: "WAITING_SUPPORT" } }),
  ]);
}

const grantSchema = z.object({
  hours: z.coerce.number().refine((h) => (GRANT_HOURS as readonly number[]).includes(h)),
  reason: requiredText(300),
  ticketId: optionalText(64),
});

/** Owner/admin grants NEXVO support time-limited, read-only access. */
export async function grantSupportAccess(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "team.manage");
  assertMember(ctx);
  const data = parse(grantSchema, input);
  if (data.ticketId && !(await prisma.supportTicket.findFirst({ where: { id: data.ticketId, organizationId: ctx.org.id } }))) throw new NotFoundError("SupportTicket");
  return prisma.$transaction(async (tx) => {
    const g = await tx.supportAccessGrant.create({
      data: { organizationId: ctx.org.id, ticketId: data.ticketId ?? null, grantedById: ctx.userId, reason: data.reason, expiresAt: new Date(Date.now() + data.hours * 3600_000) },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "support.access_granted", entityType: "SupportAccessGrant", entityId: g.id, data: { hours: data.hours } });
    return g;
  });
}

/** Revoking also ends any staff session using the grant immediately. */
export async function revokeSupportAccess(ctx: OrgContext, grantId: string) {
  requirePermission(ctx, "team.manage");
  return prisma.$transaction(async (tx) => {
    const r = await tx.supportAccessGrant.updateMany({ where: { id: grantId, organizationId: ctx.org.id, revokedAt: null }, data: { revokedAt: new Date(), revokedById: ctx.userId } });
    if (r.count === 0) throw new NotFoundError("SupportAccessGrant");
    await tx.session.updateMany({ where: { supportGrantId: grantId }, data: { supportGrantId: null, activeOrganizationId: null } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "support.access_revoked", entityType: "SupportAccessGrant", entityId: grantId });
  });
}

export async function listGrants(ctx: OrgContext) {
  requirePermission(ctx, "team.manage");
  const [grants, log] = await Promise.all([
    prisma.supportAccessGrant.findMany({ where: { organizationId: ctx.org.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.auditEvent.findMany({ where: { organizationId: ctx.org.id, action: { startsWith: "support." } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return { grants, log, names: await authorNames([...grants.map((g) => g.grantedById), ...log.map((l) => l.actorUserId ?? "")]) };
}

// ── NEXVO staff side ──

async function requireStaff(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.isPlatformStaff || u.disabledAt) throw new ForbiddenError("support.staff");
  return u;
}

export async function staffListTickets(userId: string, status?: TicketStatus) {
  await requireStaff(userId);
  const now = new Date();
  return prisma.supportTicket.findMany({
    where: status ? { status } : { status: { not: "CLOSED" } },
    include: {
      organization: { select: { name: true, id: true } },
      grants: { where: { revokedAt: null, expiresAt: { gt: now } }, select: { id: true, expiresAt: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function staffGetTicket(userId: string, id: string) {
  await requireStaff(userId);
  const t = await prisma.supportTicket.findUnique({
    where: { id },
    include: { organization: { select: { id: true, name: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!t) throw new NotFoundError("SupportTicket");
  const grant = await prisma.supportAccessGrant.findFirst({ where: { organizationId: t.organizationId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "desc" } });
  return { ...t, activeGrant: grant, names: await authorNames(t.messages.map((m) => m.authorUserId)) };
}

export async function staffReply(userId: string, id: string, input: unknown) {
  await requireStaff(userId);
  const data = parse(z.object({ body: z.string().trim().min(1).max(5000), status: z.enum(["WAITING_CUSTOMER", "RESOLVED", "CLOSED"]).default("WAITING_CUSTOMER") }), input);
  const t = await prisma.supportTicket.findUnique({ where: { id } });
  if (!t) throw new NotFoundError("SupportTicket");
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId: t.id, authorUserId: userId, authorIsStaff: true, body: data.body } }),
    prisma.supportTicket.update({ where: { id: t.id }, data: { status: data.status } }),
  ]);
}

/** Starts a read-only support session in the customer's workspace. Requires an active grant. */
export async function startSupportSession(userId: string, sessionToken: string, organizationId: string) {
  const staff = await requireStaff(userId);
  const grant = await prisma.supportAccessGrant.findFirst({ where: { organizationId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "desc" } });
  if (!grant) throw new DomainError("errors.support.noGrant");
  await prisma.$transaction(async (tx) => {
    await tx.session.updateMany({ where: { tokenHash: hashToken(sessionToken), userId }, data: { activeOrganizationId: organizationId, supportGrantId: grant.id } });
    await audit(tx, { organizationId, actorUserId: userId, action: "support.session_started", entityType: "SupportAccessGrant", entityId: grant.id, data: { staff: staff.email } });
  });
}

export async function endSupportSession(userId: string, sessionToken: string) {
  const s = await prisma.session.findFirst({ where: { tokenHash: hashToken(sessionToken), userId } });
  if (!s?.supportGrantId) return;
  const grant = await prisma.supportAccessGrant.findUnique({ where: { id: s.supportGrantId } });
  await prisma.$transaction(async (tx) => {
    await tx.session.update({ where: { id: s.id }, data: { supportGrantId: null, activeOrganizationId: null } });
    if (grant) await audit(tx, { organizationId: grant.organizationId, actorUserId: userId, action: "support.session_ended", entityType: "SupportAccessGrant", entityId: grant.id });
  });
}
