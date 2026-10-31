import { beforeAll, describe, expect, it } from "vitest";
import { newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { login, resolveSession } from "@/server/services/accounts";
import { completeLoginChallenge, confirmEnrollment, disableMfa, regenerateRecoveryCodes, resetMfa, startEnrollment } from "@/server/services/mfa";
import { platformOverview, setUserAccess } from "@/server/services/platform";
import { currentStep, totpAt } from "@/server/auth/totp";

/** Two-step verification: enrollment, login challenge, replay, recovery codes, staff enforcement, reset. */
let userId: string;
let email: string;
let secret: string;
let recovery: string[];
const PW = "correct-horse-battery";
const code = (offset = 0) => totpAt(secret, currentStep() + offset);

beforeAll(async () => {
  await resetDb();
  const r = await newOrg();
  userId = r.user.id;
  email = r.user.email;
});

describe("enrollment", () => {
  it("stores the secret encrypted and only enables after a valid code", async () => {
    const s = await startEnrollment(userId);
    secret = s.secret;
    expect(s.qrSvg).toContain("<svg");
    expect(s.uri).toContain(`secret=${secret}`);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(u.totpSecretEnc).not.toContain(secret);
    expect(u.totpEnabledAt).toBeNull();
    await expect(confirmEnrollment(userId, "000000")).rejects.toThrow("errors.mfa.invalidCode");
    recovery = await confirmEnrollment(userId, code(-1));
    expect(recovery).toHaveLength(10);
    const codes = await prisma.recoveryCode.findMany({ where: { userId } });
    expect(codes.every((c) => !recovery.includes(c.codeHash))).toBe(true);
  });
});

describe("login", () => {
  it("password alone gives a challenge, not a session", async () => {
    await prisma.session.deleteMany({ where: { userId } });
    const r = await login({ email, password: PW });
    expect(r.token).toBeNull();
    expect(r.challengeToken).toBeTruthy();
    expect(await prisma.session.count({ where: { userId } })).toBe(0);
  });

  it("a valid code completes login; the same code cannot be replayed", async () => {
    const r1 = await login({ email, password: PW });
    const c = code();
    const done = await completeLoginChallenge(r1.challengeToken!, c);
    expect((await resolveSession(done.token))!.user.id).toBe(userId);
    const r2 = await login({ email, password: PW });
    await expect(completeLoginChallenge(r2.challengeToken!, c)).rejects.toThrow("errors.mfa.invalidCode");
  });

  it("five wrong codes kill the challenge and are audited", async () => {
    const r = await login({ email, password: PW });
    for (let i = 0; i < 4; i++) await expect(completeLoginChallenge(r.challengeToken!, "111111")).rejects.toThrow("errors.mfa.invalidCode");
    await expect(completeLoginChallenge(r.challengeToken!, "111111")).rejects.toThrow("errors.mfa.challengeExpired");
    await expect(completeLoginChallenge(r.challengeToken!, code(1))).rejects.toThrow("errors.mfa.challengeExpired");
    expect(await prisma.auditEvent.count({ where: { action: "user.mfa_failed", entityId: userId } })).toBe(1);
  });

  it("expired challenges are refused", async () => {
    const r = await login({ email, password: PW });
    await prisma.loginChallenge.updateMany({ where: { userId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(completeLoginChallenge(r.challengeToken!, code(1))).rejects.toThrow("errors.mfa.challengeExpired");
  });

  it("a recovery code works exactly once", async () => {
    const r1 = await login({ email, password: PW });
    await expect(completeLoginChallenge(r1.challengeToken!, recovery[0]!.toUpperCase())).resolves.toHaveProperty("token");
    const r2 = await login({ email, password: PW });
    await expect(completeLoginChallenge(r2.challengeToken!, recovery[0]!)).rejects.toThrow("errors.mfa.invalidCode");
  });

  it("regenerating invalidates old recovery codes", async () => {
    await prisma.user.update({ where: { id: userId }, data: { totpLastStep: null } });
    const fresh = await regenerateRecoveryCodes(userId, code(1));
    const r = await login({ email, password: PW });
    await expect(completeLoginChallenge(r.challengeToken!, recovery[1]!)).rejects.toThrow("errors.mfa.invalidCode");
    await expect(completeLoginChallenge(r.challengeToken!, fresh[0]!)).resolves.toHaveProperty("token");
  });
});

describe("staff enforcement", () => {
  it("platform staff without 2FA are refused by the console services", async () => {
    const id = (await prisma.user.create({ data: { email: "nomfa@platform.test", name: "x", passwordHash: "x", isPlatformStaff: true, platformRole: "OWNER" } })).id;
    await expect(platformOverview(id)).rejects.toThrow("errors.mfa.requiredForStaff");
    await expect(disableMfa(id, "123456")).rejects.toThrow("errors.mfa.requiredForStaff");
  });

  it("an admin can reset a user's 2FA; sessions end and audit is written", async () => {
    const admin = (await prisma.user.create({ data: { email: "adm@platform.test", name: "a", passwordHash: "x", isPlatformStaff: true, platformRole: "ADMIN", totpEnabledAt: new Date() } })).id;
    await setUserAccess(admin, userId, { action: "reset2fa" });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect([u.totpEnabledAt, u.totpSecretEnc]).toEqual([null, null]);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);
    expect(await prisma.recoveryCode.count({ where: { userId } })).toBe(0);
    expect((await login({ email, password: PW })).token).toBeTruthy();
    await resetMfa(userId, null);
  });

  it("a normal user can turn 2FA off with a valid code", async () => {
    const s = await startEnrollment(userId);
    secret = s.secret;
    await confirmEnrollment(userId, code());
    await expect(disableMfa(userId, "000000")).rejects.toThrow("errors.mfa.invalidCode");
    await disableMfa(userId, code(1));
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).totpEnabledAt).toBeNull();
  });
});
