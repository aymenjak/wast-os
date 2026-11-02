"use server";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/actions/state";
import { formToObject, localeFrom, orgAction, toActionError } from "@/server/action";
import * as support from "@/server/services/support";
import { currentSession, sessionToken } from "@/server/auth/session";
import { createInvoiceCheckout } from "@/server/payments/chargily";

const s = (v: unknown) => (typeof v === "string" ? v : "");

export async function createTicketAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => `/app/support/${(await support.createTicket(ctx, input)).id}`);
}
export async function replyTicketAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => support.replyTicket(ctx, s(input.ticketId), input), { revalidate: [`/app/support/${s(fd.get("ticketId"))}`] });
}
export async function grantSupportAction(_: ActionState, fd: FormData) {
  return orgAction(fd, async (ctx, input) => void (await support.grantSupportAccess(ctx, input)), { revalidate: ["/app/support"] });
}
export async function revokeSupportAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => support.revokeSupportAccess(ctx, s(input.grantId)), { revalidate: ["/app/support"] });
}

/** Staff console actions: the caller must be platform staff (checked in the service). */
async function staff(fd: FormData) {
  const locale = localeFrom(fd);
  const sess = await currentSession();
  const token = await sessionToken();
  if (!sess || !token) redirect(`/${locale}/login`);
  return { locale, userId: sess.user.id, token };
}
export async function staffReplyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { userId } = await staff(fd);
    const input = formToObject(fd);
    await support.staffReply(userId, s(input.ticketId), input);
    return { ok: true, nonce: Date.now() };
  } catch (e) {
    return toActionError(e);
  }
}
export async function startSupportSessionAction(fd: FormData) {
  const { locale, userId, token } = await staff(fd);
  await support.startSupportSession(userId, token, s(fd.get("organizationId")));
  redirect(`/${locale}/app`);
}
export async function endSupportSessionAction(fd: FormData) {
  const { locale, userId, token } = await staff(fd);
  await support.endSupportSession(userId, token);
  redirect(`/${locale}/support-console`);
}

/** Starts a Chargily checkout and sends the browser to the provider's hosted page. */
export async function payOnlineAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let url: string | null = null;
  const r = await orgAction(fd, async (ctx, input, locale) => {
    url = (await createInvoiceCheckout(ctx, s(input.invoiceId), locale)).url;
  });
  if (url) redirect(url);
  return r;
}
