"use server";
import { redirect } from "next/navigation";
import { orgAction } from "@/server/action";
import { createPlatformCheckout } from "@/server/services/billing";
import { clearOrgChargily, setOrgChargily } from "@/server/payments/chargily";
import type { ActionState } from "@/lib/actions/state";

const s = (v: unknown) => (typeof v === "string" ? v : "");

/** Organization pays a NEXVO subscription invoice on Chargily's hosted page. */
export async function payPlatformInvoiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let url: string | null = null;
  const r = await orgAction(fd, async (ctx, input, locale) => {
    url = (await createPlatformCheckout(ctx, s(input.invoiceId), locale)).url;
  });
  if (url) redirect(url);
  return r;
}

export async function saveChargilyAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx, input) => setOrgChargily(ctx, input), { revalidate: ["/app/settings"] });
}
export async function clearChargilyAction(_: ActionState, fd: FormData) {
  return orgAction(fd, (ctx) => clearOrgChargily(ctx), { revalidate: ["/app/settings"] });
}
