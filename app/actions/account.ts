"use server";
import { revalidatePath } from "next/cache";
import { localeFrom, toActionError } from "@/server/action";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import * as mfa from "@/server/services/mfa";
import type { ActionState } from "@/lib/actions/state";

/** `refresh: false` keeps the current screen so one-time recovery codes stay visible until the user leaves. */
async function run(fd: FormData, fn: (userId: string, code: string) => Promise<Record<string, string> | void>, refresh = true): Promise<ActionState> {
  const locale = localeFrom(fd);
  const s = await requireUser(locale);
  if (s.ctx?.support) return { ok: false, error: "errors.support.readOnly", nonce: Date.now() };
  if (!(await rateLimit(`mfa-manage:${s.user.id}`, 20, 15 * 60_000)).ok) return { ok: false, error: "errors.rateLimited", nonce: Date.now() };
  try {
    const data = await fn(s.user.id, String(fd.get("code") ?? ""));
    if (refresh) revalidatePath(`/${locale}/account/security`, "page");
    return { ok: true, nonce: Date.now(), ...(data ? { data } : {}) };
  } catch (e) {
    return toActionError(e);
  }
}

export async function startMfaAction(_: ActionState, fd: FormData) {
  return run(fd, async (u) => {
    const r = await mfa.startEnrollment(u);
    return { secret: r.secret, qrSvg: r.qrSvg };
  });
}
export async function confirmMfaAction(_: ActionState, fd: FormData) {
  return run(fd, async (u, code) => ({ codes: (await mfa.confirmEnrollment(u, code)).join(" ") }), false);
}
export async function disableMfaAction(_: ActionState, fd: FormData) {
  return run(fd, (u, code) => mfa.disableMfa(u, code));
}
export async function regenerateCodesAction(_: ActionState, fd: FormData) {
  return run(fd, async (u, code) => ({ codes: (await mfa.regenerateRecoveryCodes(u, code)).join(" ") }), false);
}
