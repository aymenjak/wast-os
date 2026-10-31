"use server";
import { requireOrg } from "@/server/auth/session";
import { operationsBrief, recordAiDecision, suggestCivicTriage } from "@/server/services/ai";
import { DomainError } from "@/server/domain/errors";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { rateLimit } from "@/server/rate-limit";

function loc(l: string): Locale {
  return isLocale(l) ? l : "fr";
}
async function limited(ctxUser: string) {
  // AI calls cost money: cap per user per hour.
  return !(await rateLimit(`ai:${ctxUser}`, 30, 3600_000)).ok;
}

export async function aiBriefAction(locale: string): Promise<{ ok: true; brief: { headline: string; points: string[] } } | { ok: false; error: string }> {
  const ctx = await requireOrg(loc(locale));
  if (await limited(ctx.userId)) return { ok: false, error: "errors.rateLimited" };
  try {
    return { ok: true, brief: await operationsBrief(ctx, loc(locale)) };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.code };
    throw e;
  }
}

export async function aiTriageAction(reportId: string, locale: string) {
  const ctx = await requireOrg(loc(locale));
  if (ctx.support) return { ok: false as const, error: "errors.support.readOnly" };
  if (await limited(ctx.userId)) return { ok: false as const, error: "errors.rateLimited" };
  try {
    return { ok: true as const, suggestion: await suggestCivicTriage(ctx, String(reportId), loc(locale)) };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false as const, error: e.code };
    throw e;
  }
}

export async function aiFeedbackAction(suggestionId: string, accepted: boolean, locale: string) {
  const ctx = await requireOrg(loc(locale));
  if (ctx.support) return { ok: false as const, error: "errors.support.readOnly" };
  try {
    await recordAiDecision(ctx, { suggestionId, accepted });
    return { ok: true as const };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false as const, error: e.code };
    throw e;
  }
}

// ── Assistant (chat) ──
import { deleteConversation, sendChatMessage, setAiChatEnabled } from "@/server/services/ai-chat";
import { orgAction } from "@/server/action";
import type { ActionState } from "@/lib/actions/state";

export async function sendChatAction(conversationId: string | null, message: string, locale: string): Promise<{ ok: true; conversationId: string; reply: string; toolsUsed: string[] } | { ok: false; error: string }> {
  const ctx = await requireOrg(loc(locale));
  if (ctx.support) return { ok: false, error: "errors.support.readOnly" };
  if (!(await rateLimit(`ai-chat:${ctx.userId}`, 60, 3600_000)).ok) return { ok: false, error: "errors.rateLimited" };
  try {
    return { ok: true, ...(await sendChatMessage(ctx, { conversationId: conversationId ?? undefined, message: String(message ?? "") }, loc(locale))) };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, error: e.code };
    throw e;
  }
}

export async function deleteConversationAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx) => {
    await deleteConversation(ctx, String(fd.get("conversationId") ?? ""));
    return "/app/assistant";
  });
}

export async function setAiChatAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => setAiChatEnabled(ctx, fd.get("enabled") === "true"), { revalidate: ["/app/settings", "/app/assistant"] });
}
