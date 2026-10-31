import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createSessionRecord, resolveSession } from "@/server/services/accounts";
import { createCustomer } from "@/server/services/customers";
import { createTicket, endSupportSession, getTicket, grantSupportAccess, listGrants, listTickets, replyTicket, revokeSupportAccess, staffGetTicket, staffListTickets, staffReply, startSupportSession } from "@/server/services/support";
import type { OrgContext } from "@/server/context";

/** Remote support: customer-granted, time-limited, read-only, audited. */
let owner: OrgContext;
let other: OrgContext;
let staffId: string;
let staffToken: string;

beforeAll(async () => {
  await resetDb();
  owner = (await newOrg()).ctx;
  other = (await newOrg()).ctx;
  staffId = (await prisma.user.create({ data: { email: "staff@nexvo.test", name: "Support", passwordHash: "x", isPlatformStaff: true, platformRole: "SUPPORT" } })).id;
  staffToken = await createSessionRecord(prisma, staffId, null);
});

describe("tickets", () => {
  it("customer opens a ticket; other tenants cannot see it", async () => {
    const t = await createTicket(owner, { subject: "Facture introuvable", category: "BILLING", body: "Je ne trouve pas la facture d'octobre." });
    expect(t.number).toMatch(/^SUP-\d{4}$/);
    expect((await listTickets(owner)).map((x) => x.id)).toContain(t.id);
    expect(await listTickets(other)).toHaveLength(0);
    await expect(getTicket(other, t.id)).rejects.toThrow(/not found|NotFound/i);
    await expect(replyTicket(other, t.id, { body: "x" })).rejects.toThrow(/not found|NotFound/i);
  });

  it("customer-portal users cannot open workspace support tickets", async () => {
    const c = await createCustomer(owner, { name: "Client" });
    const portal = await addMember(owner, "CUSTOMER_PORTAL", c.id);
    await expect(createTicket(portal, { subject: "x", body: "hello there" })).rejects.toThrow();
  });

  it("staff see and answer tickets; non-staff cannot use the console", async () => {
    const [t] = await listTickets(owner);
    expect((await staffListTickets(staffId)).map((x) => x.id)).toContain(t!.id);
    await staffReply(staffId, t!.id, { body: "Bonjour, nous regardons.", status: "WAITING_CUSTOMER" });
    const full = await getTicket(owner, t!.id);
    expect(full.messages.at(-1)!.authorIsStaff).toBe(true);
    expect(full.status).toBe("WAITING_CUSTOMER");
    await expect(staffListTickets(owner.userId)).rejects.toThrow();
    await expect(staffGetTicket(owner.userId, t!.id)).rejects.toThrow();
    await expect(staffReply(owner.userId, t!.id, { body: "x" })).rejects.toThrow();
  });
});

describe("access grants and support sessions", () => {
  it("staff cannot enter a workspace without a grant", async () => {
    await expect(startSupportSession(staffId, staffToken, owner.org.id)).rejects.toThrow("errors.support.noGrant");
  });

  it("only admins grant; durations are limited to 1/4/24 hours", async () => {
    const viewer = await addMember(owner, "VIEWER");
    await expect(grantSupportAccess(viewer, { hours: 4, reason: "test" })).rejects.toThrow();
    await expect(grantSupportAccess(owner, { hours: 72, reason: "test" })).rejects.toThrow();
  });

  it("a granted session is read-only VIEWER, under the staff identity, and audited", async () => {
    const g = await grantSupportAccess(owner, { hours: 1, reason: "Investigate missing invoice" });
    expect(g.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(3600_000);
    await startSupportSession(staffId, staffToken, owner.org.id);
    const s = await resolveSession(staffToken);
    expect(s!.ctx!.org.id).toBe(owner.org.id);
    expect(s!.ctx!.userId).toBe(staffId);
    expect(s!.ctx!.role).toBe("VIEWER");
    expect(s!.ctx!.support?.grantId).toBe(g.id);
    expect(s!.ctx!.permissions.has("customers.write")).toBe(false);
    expect(s!.ctx!.permissions.has("invoices.write")).toBe(false);
    expect(s!.ctx!.permissions.has("team.manage")).toBe(false);
    // Support sessions cannot extend their own access or act as the customer on tickets.
    await expect(grantSupportAccess(s!.ctx!, { hours: 24, reason: "extend" })).rejects.toThrow();
    await expect(createTicket(s!.ctx!, { subject: "x", body: "hello there" })).rejects.toThrow();
    const { log } = await listGrants(owner);
    expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["support.access_granted", "support.session_started"]));
  });

  it("a grant in one tenant gives no access to another", async () => {
    await expect(startSupportSession(staffId, staffToken, other.org.id)).rejects.toThrow("errors.support.noGrant");
    await expect(revokeSupportAccess(other, (await prisma.supportAccessGrant.findFirstOrThrow({ where: { organizationId: owner.org.id } })).id)).rejects.toThrow(/not found|NotFound/i);
  });

  it("revoking ends the live session immediately", async () => {
    const g = await prisma.supportAccessGrant.findFirstOrThrow({ where: { organizationId: owner.org.id, revokedAt: null } });
    await revokeSupportAccess(owner, g.id);
    const s = await resolveSession(staffToken);
    expect(s!.ctx).toBeNull();
    expect((await prisma.session.findFirstOrThrow({ where: { userId: staffId } })).supportGrantId).toBeNull();
  });

  it("an expired grant stops working without any action", async () => {
    const g = await grantSupportAccess(owner, { hours: 1, reason: "expiry test" });
    await startSupportSession(staffId, staffToken, owner.org.id);
    await prisma.supportAccessGrant.update({ where: { id: g.id }, data: { createdAt: new Date(Date.now() - 7200_000), expiresAt: new Date(Date.now() - 1000) } });
    expect((await resolveSession(staffToken))!.ctx).toBeNull();
  });

  it("losing staff status ends access even with a valid grant", async () => {
    await grantSupportAccess(owner, { hours: 1, reason: "staff flag test" });
    await startSupportSession(staffId, staffToken, owner.org.id);
    await prisma.user.update({ where: { id: staffId }, data: { isPlatformStaff: false, platformRole: null } });
    expect((await resolveSession(staffToken))!.ctx).toBeNull();
    await prisma.user.update({ where: { id: staffId }, data: { isPlatformStaff: true, platformRole: "SUPPORT" } });
  });

  it("ending the session is audited", async () => {
    await startSupportSession(staffId, staffToken, owner.org.id);
    await endSupportSession(staffId, staffToken);
    expect((await resolveSession(staffToken))!.ctx).toBeNull();
    expect(await prisma.auditEvent.count({ where: { organizationId: owner.org.id, action: "support.session_ended" } })).toBe(1);
  });
});
