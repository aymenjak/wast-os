import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { prisma } from "../db";
import { DomainError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { hashToken, newToken } from "../auth/tokens";
import { otpauthUri, newTotpSecret, verifyTotp } from "../auth/totp";
import { decryptSecret, encryptSecret } from "../crypto";
import { createSessionRecord } from "./accounts";

/**
 * Two-factor authentication (TOTP + one-time recovery codes).
 * Mandatory for platform staff (enforced in services/platform.ts, services/support.ts and the console layouts),
 * optional for everyone else. Secrets are encrypted at rest; recovery codes are stored as SHA-256 hashes.
 */
const CHALLENGE_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;
const RECOVERY_CODES = 10;

function newRecoveryCode() {
  const s = randomBytes(5).toString("hex"); // 40 bits per code, single use, rate-limited
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
const normalizeRecovery = (c: string) => c.trim().toLowerCase().replace(/\s/g, "");

export async function mfaStatus(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { totpEnabledAt: true, platformRole: true } });
  const remaining = await prisma.recoveryCode.count({ where: { userId, usedAt: null } });
  return { enabled: !!u.totpEnabledAt, enabledAt: u.totpEnabledAt, required: !!u.platformRole, recoveryRemaining: remaining };
}

/** Step 1: a new pending secret (replaces any unconfirmed one). Returns what the authenticator app needs. */
export async function startEnrollment(userId: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.totpEnabledAt) throw new DomainError("errors.mfa.alreadyEnabled");
  const secret = newTotpSecret();
  await prisma.user.update({ where: { id: userId }, data: { totpSecretEnc: encryptSecret(secret), totpLastStep: null } });
  const uri = otpauthUri(secret, u.email);
  const qrSvg = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return { secret, uri, qrSvg };
}

async function issueRecoveryCodes(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], userId: string) {
  const codes = Array.from({ length: RECOVERY_CODES }, newRecoveryCode);
  await tx.recoveryCode.deleteMany({ where: { userId } });
  await tx.recoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hashToken(normalizeRecovery(c)) })) });
  return codes;
}

/** Step 2: the user proves the app works; 2FA becomes active and recovery codes are shown once. */
export async function confirmEnrollment(userId: string, code: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.totpEnabledAt) throw new DomainError("errors.mfa.alreadyEnabled");
  if (!u.totpSecretEnc) throw new DomainError("errors.mfa.notStarted");
  const step = verifyTotp(decryptSecret(u.totpSecretEnc), code, null);
  if (step === null) throw new DomainError("errors.mfa.invalidCode");
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { totpEnabledAt: new Date(), totpLastStep: step } });
    const codes = await issueRecoveryCodes(tx, userId);
    await audit(tx, { organizationId: null, actorUserId: userId, action: "user.mfa_enabled", entityType: "User", entityId: userId });
    return codes;
  });
}

/** Checks a TOTP code (atomically consuming its time step) or a recovery code (atomically marking it used). */
export async function verifySecondFactor(userId: string, code: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.totpEnabledAt || !u.totpSecretEnc) return false;
  const step = verifyTotp(decryptSecret(u.totpSecretEnc), code, u.totpLastStep);
  if (step !== null) {
    const r = await prisma.user.updateMany({ where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] }, data: { totpLastStep: step } });
    return r.count === 1;
  }
  const norm = normalizeRecovery(code);
  if (!/^[0-9a-f]{5}-[0-9a-f]{5}$/.test(norm)) return false;
  const used = await prisma.recoveryCode.updateMany({ where: { userId, codeHash: hashToken(norm), usedAt: null }, data: { usedAt: new Date() } });
  if (used.count === 1) await audit(prisma, { organizationId: null, actorUserId: userId, action: "user.mfa_recovery_used", entityType: "User", entityId: userId });
  return used.count === 1;
}

export async function disableMfa(userId: string, code: string) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (u.platformRole) throw new DomainError("errors.mfa.requiredForStaff");
  if (!u.totpEnabledAt) throw new DomainError("errors.mfa.notEnabled");
  if (!(await verifySecondFactor(userId, code))) throw new DomainError("errors.mfa.invalidCode");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { totpEnabledAt: null, totpSecretEnc: null, totpLastStep: null } });
    await tx.recoveryCode.deleteMany({ where: { userId } });
    await audit(tx, { organizationId: null, actorUserId: userId, action: "user.mfa_disabled", entityType: "User", entityId: userId });
  });
}

export async function regenerateRecoveryCodes(userId: string, code: string) {
  if (!(await verifySecondFactor(userId, code))) throw new DomainError("errors.mfa.invalidCode");
  return prisma.$transaction(async (tx) => {
    const codes = await issueRecoveryCodes(tx, userId);
    await audit(tx, { organizationId: null, actorUserId: userId, action: "user.mfa_recovery_regenerated", entityType: "User", entityId: userId });
    return codes;
  });
}

/** Lost phone and codes: an admin (or the CLI) removes 2FA; the user must enroll again. All sessions end. */
export async function resetMfa(targetUserId: string, actorUserId: string | null) {
  const u = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!u) throw new NotFoundError("User");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: u.id }, data: { totpEnabledAt: null, totpSecretEnc: null, totpLastStep: null } });
    await tx.recoveryCode.deleteMany({ where: { userId: u.id } });
    await tx.session.deleteMany({ where: { userId: u.id } });
    await audit(tx, { organizationId: null, actorType: actorUserId ? "USER" : "SYSTEM", actorUserId, action: "user.mfa_reset", entityType: "User", entityId: u.id });
  });
}

// ── Login challenge ──

export async function createLoginChallenge(userId: string, userAgent?: string) {
  const token = newToken();
  await prisma.loginChallenge.deleteMany({ where: { OR: [{ userId }, { expiresAt: { lt: new Date() } }] } });
  await prisma.loginChallenge.create({ data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS), userAgent } });
  return token;
}

/** Second step of login. Five wrong codes or ten minutes and the password step must be repeated. */
export async function completeLoginChallenge(challengeToken: string, code: string, userAgent?: string) {
  const ch = await prisma.loginChallenge.findUnique({ where: { tokenHash: hashToken(challengeToken) }, include: { user: { include: { memberships: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, take: 1 } } } } });
  if (!ch || ch.expiresAt < new Date() || ch.attempts >= MAX_ATTEMPTS || ch.user.disabledAt) {
    if (ch) await prisma.loginChallenge.delete({ where: { id: ch.id } }).catch(() => undefined);
    throw new DomainError("errors.mfa.challengeExpired");
  }
  if (!(await verifySecondFactor(ch.userId, code))) {
    const next = await prisma.loginChallenge.update({ where: { id: ch.id }, data: { attempts: { increment: 1 } } });
    if (next.attempts >= MAX_ATTEMPTS) {
      await prisma.loginChallenge.delete({ where: { id: ch.id } });
      await audit(prisma, { organizationId: null, actorType: "SYSTEM", action: "user.mfa_failed", entityType: "User", entityId: ch.userId });
      throw new DomainError("errors.mfa.challengeExpired");
    }
    throw new DomainError("errors.mfa.invalidCode");
  }
  await prisma.loginChallenge.delete({ where: { id: ch.id } });
  const token = await createSessionRecord(prisma, ch.userId, ch.user.memberships[0]?.organizationId ?? null, userAgent ?? ch.userAgent ?? undefined);
  return { token, user: ch.user };
}
