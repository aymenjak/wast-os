import { z } from "zod";
import { prisma } from "../db";
import { DomainError } from "../domain/errors";
import { audit } from "../audit";
import { hashPassword } from "../auth/password";
import { hashToken, newToken } from "../auth/tokens";
import { email, parse, password } from "../validation";
import { enqueueEmail } from "./mailer";
import { passwordResetEmail } from "../email/templates";
import { isLocale } from "@/lib/i18n/config";

/**
 * Password reset by email (OWASP Forgot Password guidance):
 *  - the same response whether or not the account exists (no enumeration);
 *  - random 256-bit single-use token, only its hash stored, valid 30 minutes; a new request invalidates older links;
 *  - success sets the new password, clears lockout, ends every session; two-step verification still applies at login.
 */
const TTL_MS = 30 * 60_000;

export async function requestPasswordReset(input: unknown) {
  const data = parse(z.object({ email, locale: z.string().optional() }), input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || user.disabledAt) return; // identical outcome for unknown accounts
  const locale = data.locale && isLocale(data.locale) ? data.locale : user.locale;
  const token = newToken();
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TTL_MS) } });
    const m = passwordResetEmail(locale, `${process.env.APP_URL ?? ""}/${locale}/reset/${token}`);
    await enqueueEmail(tx, { organizationId: null, to: user.email, type: "password.reset", sensitive: true, ...m });
    await audit(tx, { organizationId: null, actorType: "SYSTEM", action: "user.password_reset_requested", entityType: "User", entityId: user.id });
  });
}

export async function resetTokenValid(token: string) {
  const t = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  return !!t && !t.usedAt && t.expiresAt > new Date();
}

export async function resetPassword(input: unknown) {
  const data = parse(z.object({ token: z.string().min(20).max(100), password }), input);
  const passwordHash = await hashPassword(data.password);
  await prisma.$transaction(async (tx) => {
    // Atomic single use: only one request can flip usedAt.
    const t = await tx.passwordResetToken.findUnique({ where: { tokenHash: hashToken(data.token) } });
    if (!t || t.usedAt || t.expiresAt <= new Date()) throw new DomainError("errors.auth.resetInvalid");
    const used = await tx.passwordResetToken.updateMany({ where: { id: t.id, usedAt: null }, data: { usedAt: new Date() } });
    if (used.count !== 1) throw new DomainError("errors.auth.resetInvalid");
    await tx.user.update({ where: { id: t.userId }, data: { passwordHash, failedLogins: 0, lockedUntil: null } });
    await tx.session.deleteMany({ where: { userId: t.userId } });
    await tx.loginChallenge.deleteMany({ where: { userId: t.userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId: t.userId, usedAt: null } });
    await audit(tx, { organizationId: null, actorType: "USER", actorUserId: t.userId, action: "user.password_reset", entityType: "User", entityId: t.userId });
  });
}
