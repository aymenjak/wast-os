import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSession, SESSION_TTL_MS } from "../services/accounts";
import type { OrgContext } from "../context";
import type { Locale } from "@/lib/i18n/config";

export const SESSION_COOKIE = "nexvo_session";

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Fail closed: secure whenever we run in production OR are served over HTTPS.
    secure: process.env.NODE_ENV === "production" || (process.env.APP_URL ?? "").startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

const CHALLENGE_COOKIE = "nexvo_2fa";

/** Short-lived cookie holding the pending second-factor challenge (no session yet). */
export async function setChallengeCookie(token: string) {
  (await cookies()).set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || (process.env.APP_URL ?? "").startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}
export async function challengeToken() {
  return (await cookies()).get(CHALLENGE_COOKIE)?.value ?? null;
}
export async function clearChallengeCookie() {
  (await cookies()).delete(CHALLENGE_COOKIE);
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Cached per request. */
export const currentSession = cache(async () => {
  const token = await sessionToken();
  if (!token) return null;
  return resolveSession(token);
});

export async function requireUser(locale: Locale) {
  const s = await currentSession();
  if (!s) redirect(`/${locale}/login`);
  return s;
}

/** Pages under /app and /portal call this; it never trusts anything from the client. */
export async function requireOrg(locale: Locale): Promise<OrgContext> {
  const s = await requireUser(locale);
  if (!s.ctx) redirect(`/${locale}/login?${s.suspended ? "suspended" : "no-org"}=1`);
  return s.ctx;
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function userAgent() {
  return (await headers()).get("user-agent") ?? undefined;
}
