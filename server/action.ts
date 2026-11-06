import "server-only";
import { runAsTenant } from "./tenant-scope";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DomainError } from "./domain/errors";
import { requireOrg } from "./auth/session";
import type { OrgContext } from "./context";
import type { ActionState } from "@/lib/actions/state";
import { isLocale, type Locale } from "@/lib/i18n/config";

function isRedirect(e: unknown) {
  return typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT");
}

export function formToObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    if (typeof v !== "string") continue;
    if (k.endsWith("[]")) {
      const key = k.slice(0, -2);
      (out[key] = (out[key] as unknown[] | undefined) ?? []);
      (out[key] as unknown[]).push(v);
    } else out[k] = v;
  }
  return out;
}

export function localeFrom(fd: FormData): Locale {
  const l = fd.get("locale");
  return typeof l === "string" && isLocale(l) ? l : "fr";
}

/** Maps domain errors to translatable codes; anything else is logged server-side and reported generically. */
export function toActionError(e: unknown): ActionState {
  if (e instanceof DomainError) {
    const fields = (e.details?.fields as Record<string, string> | undefined) ?? undefined;
    return { ok: false, error: e.code, errorVars: e.details, fields, nonce: Date.now() };
  }
  console.error("[action] unexpected error", e);
  return { ok: false, error: "errors.generic", nonce: Date.now() };
}

/**
 * Standard wrapper for authenticated server actions: resolves the org context from the
 * session cookie, runs the service, revalidates, and either redirects or returns state.
 */
export async function orgAction(
  fd: FormData,
  fn: (ctx: OrgContext, input: Record<string, unknown>, locale: Locale) => Promise<string | void | ActionState>,
  opts: { revalidate?: string[] } = {},
): Promise<ActionState> {
  const locale = localeFrom(fd);
  const ctx = await requireOrg(locale);
  // Defence in depth: a NEXVO support session is read-only whatever permissions it would otherwise have.
  if (ctx.support) return { ok: false, error: "errors.support.readOnly", nonce: Date.now() };
  let result: string | void | ActionState;
  try {
    result = await runAsTenant(ctx.org.id, () => fn(ctx, formToObject(fd), locale));
  } catch (e) {
    if (isRedirect(e)) throw e;
    return toActionError(e);
  }
  for (const p of opts.revalidate ?? []) revalidatePath(`/${locale}${p}`, "page");
  if (typeof result === "string") redirect(`/${locale}${result}`);
  return typeof result === "object" ? { ok: true, nonce: Date.now(), ...result } : { ok: true, nonce: Date.now() };
}
