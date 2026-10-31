import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createSessionRecord, login, resolveSession } from "@/server/services/accounts";
import { submitCivicReport } from "@/server/services/civic";
import {
  changeSubscription, findUserAccount, getTenant, listTenants, platformAudit, platformOverview, reactivateTenant,
  setStaffRole, setUserAccess, setVerification, suspendTenant, TENANT_SORTS, updatePlan,
} from "@/server/services/platform";
import { tableState } from "@/server/table";

/** Platform operator console: role hierarchy, tenant control, suspension, plans, staff, accounts, audit. */
let ownerId: string;
let adminId: string;
let supportId: string;
let tenant: Awaited<ReturnType<typeof newOrg>>;
let muni: Awaited<ReturnType<typeof newOrg>>;
const mk = (email: string, role: "OWNER" | "ADMIN" | "SUPPORT") =>
  prisma.user.create({ data: { email, name: email, passwordHash: "x", isPlatformStaff: true, platformRole: role } }).then((u) => u.id);
const st = (q: Record<string, string> = {}) => tableState(q, TENANT_SORTS, { sort: "createdAt", dir: "desc" });

beforeAll(async () => {
  await resetDb();
  ownerId = await mk("owner@platform.test", "OWNER");
  adminId = await mk("admin@platform.test", "ADMIN");
  supportId = await mk("support@platform.test", "SUPPORT");
  tenant = await newOrg("SERVICE_PROVIDER", "Collecte Atlas");
  muni = await newOrg("MUNICIPALITY", "APC Test");
});

describe("role hierarchy", () => {
  it("tenant users and support agents cannot use the console", async () => {
    for (const id of [tenant.user.id, supportId]) {
      await expect(platformOverview(id)).rejects.toThrow();
      await expect(listTenants(id, st())).rejects.toThrow();
      await expect(suspendTenant(id, tenant.org.id, { reason: "x" })).rejects.toThrow();
      await expect(platformAudit(id)).rejects.toThrow();
    }
  });

  it("admins manage tenants but not plans or staff", async () => {
    await expect(platformOverview(adminId)).resolves.toBeTruthy();
    await expect(updatePlan(adminId, "STARTER", { name: "x", priceMonthly: "1", priceYearly: "1", maxUsers: 1, maxVehicles: 1, maxCustomers: 1 })).rejects.toThrow();
    await expect(setStaffRole(adminId, { email: "support@platform.test", role: "ADMIN" })).rejects.toThrow();
  });

  it("a disabled owner loses the console", async () => {
    const id = await mk("old-owner@platform.test", "OWNER");
    await prisma.user.update({ where: { id }, data: { disabledAt: new Date() } });
    await expect(platformOverview(id)).rejects.toThrow();
  });
});

describe("tenants", () => {
  it("lists and searches organizations, including by member email", async () => {
    expect((await listTenants(adminId, st())).total).toBe(2);
    expect((await listTenants(adminId, st({ q: "atlas" }))).rows.map((r) => r.name)).toEqual(["Collecte Atlas"]);
    expect((await listTenants(adminId, st({ q: tenant.user.email }))).rows.map((r) => r.id)).toEqual([tenant.org.id]);
    expect((await listTenants(adminId, st({ filter: "MUNICIPALITY" }))).rows.map((r) => r.id)).toEqual([muni.org.id]);
  });

  it("detail shows metadata and counts, not business records", async () => {
    const t = await getTenant(adminId, tenant.org.id);
    expect(t.members[0]!.user.email).toBe(tenant.user.email);
    expect(Object.keys(t.usage).sort()).toEqual(["civic30", "customers", "invoices", "vehicles", "workOrders30"]);
    expect(t).not.toHaveProperty("customers");
  });

  it("changes the subscription and records it in the tenant's audit log", async () => {
    await changeSubscription(adminId, tenant.org.id, { planCode: "PRO", status: "ACTIVE", currentPeriodEnd: isoDay(30) });
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { organizationId: tenant.org.id } });
    expect([sub.planCode, sub.status]).toEqual(["PRO", "ACTIVE"]);
    const ev = await prisma.auditEvent.findFirstOrThrow({ where: { organizationId: tenant.org.id, action: "platform.subscription_changed" } });
    expect(ev.actorUserId).toBe(adminId);
    await expect(changeSubscription(adminId, tenant.org.id, { planCode: "NOPE", status: "ACTIVE", currentPeriodEnd: isoDay(30) })).rejects.toThrow();
  });

  it("verifies municipalities", async () => {
    await prisma.organization.update({ where: { id: muni.org.id }, data: { verificationStatus: "PENDING" } });
    await setVerification(adminId, muni.org.id, { status: "VERIFIED" });
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: muni.org.id } })).verificationStatus).toBe("VERIFIED");
  });

  it("overview counts list-price revenue from active subscriptions only", async () => {
    const o = await platformOverview(ownerId);
    expect(o.tenants).toEqual({ SERVICE_PROVIDER: 1, MUNICIPALITY: 1 });
    expect(o.byPlan).toEqual({ PRO: 1 });
    expect(o.listMrrMinor).toBe(2990000);
  });
});

describe("suspension", () => {
  it("blocks members immediately, keeps data, and is reversible", async () => {
    const token = await createSessionRecord(prisma, tenant.user.id, tenant.org.id);
    expect((await resolveSession(token))!.ctx).not.toBeNull();
    await expect(suspendTenant(adminId, tenant.org.id, { reason: "" })).rejects.toThrow();
    await suspendTenant(adminId, tenant.org.id, { reason: "Non-paiement (test)" });
    const s = await resolveSession(token);
    expect(s!.ctx).toBeNull();
    expect(s!.suspended).toBe(true);
    await expect(suspendTenant(adminId, tenant.org.id, { reason: "again" })).rejects.toThrow("errors.platform.alreadySuspended");
    expect(await prisma.subscription.count({ where: { organizationId: tenant.org.id } })).toBe(1);
    await reactivateTenant(adminId, tenant.org.id);
    expect((await resolveSession(token))!.ctx).not.toBeNull();
    const actions = (await prisma.auditEvent.findMany({ where: { organizationId: tenant.org.id, action: { startsWith: "platform.tenant_" } } })).map((e) => e.action);
    expect(actions.sort()).toEqual(["platform.tenant_reactivated", "platform.tenant_suspended"]);
  });

  it("a suspended municipality stops receiving public citizen reports", async () => {
    await suspendTenant(adminId, muni.org.id, { reason: "test" });
    await expect(submitCivicReport({ municipality: muni.org.slug, category: "OVERFLOWING_BIN", description: "Bac plein (test)", latitude: "36.7", longitude: "3.0", clientSubmissionId: randomUUID() })).rejects.toThrow();
    await reactivateTenant(adminId, muni.org.id);
  });
});

describe("plans (owner)", () => {
  it("updates price and limits, audited; invalid values refused", async () => {
    await updatePlan(ownerId, "STARTER", { name: "Starter", priceMonthly: "10900", priceYearly: "109000", maxUsers: "6", maxVehicles: "3", maxCustomers: "-1", customerPortal: "on" });
    const p = await prisma.plan.findUniqueOrThrow({ where: { code: "STARTER" } });
    expect([p.priceMonthly.toString(), p.maxUsers, p.maxCustomers, p.customerPortal, p.isPublic]).toEqual(["10900", 6, -1, true, false]);
    expect(await prisma.auditEvent.count({ where: { action: "platform.plan_updated", entityId: "STARTER" } })).toBe(1);
    await expect(updatePlan(ownerId, "STARTER", { name: "x", priceMonthly: "-5", priceYearly: "1", maxUsers: 1, maxVehicles: 1, maxCustomers: 1 })).rejects.toThrow();
  });
});

describe("staff and accounts", () => {
  it("owner grants and removes roles; cannot change self or remove the last owner", async () => {
    await setStaffRole(ownerId, { email: tenant.user.email, role: "SUPPORT" });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: tenant.user.id } })).platformRole).toBe("SUPPORT");
    await setStaffRole(ownerId, { email: tenant.user.email, role: "NONE" });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: tenant.user.id } });
    expect([u.platformRole, u.isPlatformStaff]).toEqual([null, false]);
    await expect(setStaffRole(ownerId, { email: "owner@platform.test", role: "ADMIN" })).rejects.toThrow("errors.platform.notSelf");
    await expect(setStaffRole(ownerId, { email: "nobody@x.test", role: "ADMIN" })).rejects.toThrow("errors.platform.userNotFound");
    const second = await mk("owner2@platform.test", "OWNER");
    await setStaffRole(second, { email: "owner@platform.test", role: "ADMIN" });
    await expect(setStaffRole(ownerId, { email: "owner2@platform.test", role: "ADMIN" })).rejects.toThrow();
    await prisma.user.update({ where: { id: ownerId }, data: { platformRole: "OWNER" } });
    await expect(setStaffRole(ownerId, { email: "owner2@platform.test", role: "NONE" })).resolves.toBeUndefined();
    await expect(setStaffRole(ownerId, { email: "admin@platform.test", role: "OWNER" })).resolves.toBeUndefined();
    await setStaffRole(ownerId, { email: "admin@platform.test", role: "ADMIN" });
  });

  it("the role and staff flag can never disagree (database CHECK)", async () => {
    await expect(prisma.user.update({ where: { id: supportId }, data: { platformRole: null } })).rejects.toThrow();
  });

  it("admins disable, enable and unlock accounts; disabling ends sessions", async () => {
    expect((await findUserAccount(adminId, tenant.user.email.slice(0, 8))).map((u) => u.id)).toContain(tenant.user.id);
    const token = await createSessionRecord(prisma, tenant.user.id, tenant.org.id);
    await setUserAccess(adminId, tenant.user.id, { action: "disable" });
    expect(await resolveSession(token)).toBeNull();
    await expect(login({ email: tenant.user.email, password: "correct-horse-battery" })).rejects.toThrow();
    await setUserAccess(adminId, tenant.user.id, { action: "enable" });
    await prisma.user.update({ where: { id: tenant.user.id }, data: { lockedUntil: new Date(Date.now() + 600_000) } });
    await setUserAccess(adminId, tenant.user.id, { action: "unlock" });
    await expect(login({ email: tenant.user.email, password: "correct-horse-battery" })).resolves.toHaveProperty("token");
  });

  it("admins cannot disable owners or themselves", async () => {
    await expect(setUserAccess(adminId, ownerId, { action: "disable" })).rejects.toThrow();
    await expect(setUserAccess(adminId, adminId, { action: "disable" })).rejects.toThrow("errors.platform.notSelf");
  });

  it("platform audit lists staff actions", async () => {
    const { events } = await platformAudit(ownerId);
    expect(events.map((e) => e.action)).toEqual(expect.arrayContaining(["platform.tenant_suspended", "platform.plan_updated", "platform.staff_role_changed", "platform.user_disabled"]));
  });
});
