"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/server/db";
import { rateLimit } from "@/server/rate-limit";
import { challengeToken, clearChallengeCookie, clientIp, clearSessionCookie, sessionToken, setChallengeCookie, setSessionCookie, userAgent } from "@/server/auth/session";
import { completeLoginChallenge } from "@/server/services/mfa";
import { acceptInvitation, login, logout, registerOrganization, switchOrganization, resolveSession } from "@/server/services/accounts";
import { citizenFeedback, submitCivicReport } from "@/server/services/civic";
import { formToObject, localeFrom, toActionError } from "@/server/action";
import { parse, email, requiredText } from "@/server/validation";
import type { ActionState } from "@/lib/actions/state";

async function limited(bucket: string, limit: number, windowMs: number): Promise<ActionState | null> {
  const r = await rateLimit(`${bucket}:${await clientIp()}`, limit, windowMs);
  return r.ok ? null : { ok: false, error: "errors.rateLimited", nonce: Date.now() };
}

/** Where a freshly signed-in user lands. */
async function landingFor(locale: string, token: string, platformRole: string | null) {
  const s = await resolveSession(token);
  if (s?.ctx?.role === "CUSTOMER_PORTAL") return `/${locale}/portal`;
  if (s?.ctx) return `/${locale}/app`;
  if (platformRole === "OWNER" || platformRole === "ADMIN") return `/${locale}/platform`;
  if (platformRole === "SUPPORT") return `/${locale}/support-console`;
  return `/${locale}/login?${s?.suspended ? "suspended" : "no-org"}=1`;
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeFrom(fd);
  const blocked = await limited("login", 10, 15 * 60_000);
  if (blocked) return blocked;
  let destination: string;
  try {
    const r = await login(formToObject(fd), { userAgent: await userAgent() });
    if (r.challengeToken) {
      await setChallengeCookie(r.challengeToken);
      destination = `/${locale}/login/2fa`;
    } else {
      await setSessionCookie(r.token!);
      destination = await landingFor(locale, r.token!, r.user.platformRole);
    }
  } catch (e) {
    return toActionError(e);
  }
  redirect(destination);
}

export async function secondFactorAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeFrom(fd);
  const blocked = await limited("mfa", 20, 15 * 60_000);
  if (blocked) return blocked;
  const challenge = await challengeToken();
  if (!challenge) redirect(`/${locale}/login`);
  let destination: string;
  try {
    const { token, user } = await completeLoginChallenge(challenge, String(fd.get("code") ?? ""), await userAgent());
    await clearChallengeCookie();
    await setSessionCookie(token);
    destination = await landingFor(locale, token, user.platformRole);
  } catch (e) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "errors.mfa.challengeExpired") await clearChallengeCookie();
    return toActionError(e);
  }
  redirect(destination);
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeFrom(fd);
  const blocked = await limited("register", 5, 60 * 60_000);
  if (blocked) return blocked;
  try {
    const { token } = await registerOrganization({ ...formToObject(fd), locale }, { userAgent: await userAgent() });
    await setSessionCookie(token);
  } catch (e) {
    return toActionError(e);
  }
  redirect(`/${locale}/app`);
}

export async function acceptInvitationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const locale = localeFrom(fd);
  const blocked = await limited("invite", 10, 15 * 60_000);
  if (blocked) return blocked;
  let portal = false;
  try {
    const { token, organizationId, user } = await acceptInvitation(formToObject(fd), { userAgent: await userAgent() });
    await setSessionCookie(token);
    const m = await prisma.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: user.id } } });
    portal = m?.role === "CUSTOMER_PORTAL";
  } catch (e) {
    return toActionError(e);
  }
  redirect(`/${locale}/${portal ? "portal" : "app"}`);
}

export async function logoutAction(fd: FormData) {
  const locale = localeFrom(fd);
  const token = await sessionToken();
  if (token) await logout(token);
  await clearSessionCookie();
  redirect(`/${locale}/login`);
}

export async function switchOrgAction(fd: FormData) {
  const locale = localeFrom(fd);
  const token = await sessionToken();
  const s = token ? await resolveSession(token) : null;
  const orgId = fd.get("organizationId");
  if (!token || !s || typeof orgId !== "string") redirect(`/${locale}/login`);
  await switchOrganization(token, s.user.id, orgId);
  redirect(`/${locale}/app`);
}

const contactSchema = z.object({ name: requiredText(120), company: requiredText(160), email, message: z.string().trim().min(10).max(4000) });

export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = await limited("contact", 5, 60 * 60_000);
  if (blocked) return blocked;
  try {
    const data = parse(contactSchema, formToObject(fd));
    // Queued in the outbox; a worker forwards it to the sales inbox configured in SALES_EMAIL.
    await prisma.notification.create({
      data: { channel: "EMAIL", recipient: process.env.SALES_EMAIL ?? null, type: "contact.request", payload: data },
    });
    return { ok: true, nonce: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}

export async function submitReportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = await limited("civic-report", 10, 60 * 60_000);
  if (blocked) return blocked;
  try {
    const files = fd.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
    const photos = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
    const r = await submitCivicReport(formToObject(fd), photos);
    return { ok: true, data: { trackingCode: r.trackingCode }, nonce: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}

export async function citizenFeedbackAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const blocked = await limited("civic-feedback", 20, 60 * 60_000);
  if (blocked) return blocked;
  try {
    await citizenFeedback(formToObject(fd));
    return { ok: true, nonce: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}

export async function trackLookupAction(fd: FormData) {
  const locale = localeFrom(fd);
  const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  redirect(`/${locale}/civic/track/${encodeURIComponent(code)}`);
}
