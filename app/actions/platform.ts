"use server";
import { revalidatePath } from "next/cache";
import { formToObject, localeFrom, toActionError } from "@/server/action";
import { requireUser } from "@/server/auth/session";
import { rateLimit } from "@/server/rate-limit";
import * as platform from "@/server/services/platform";
import * as billing from "@/server/services/billing";
import type { ActionState } from "@/lib/actions/state";

const s = (v: unknown) => (typeof v === "string" ? v : "");

/** Platform actions run as the signed-in user; every service call re-checks the platform role. */
async function platformAction(fd: FormData, fn: (userId: string, input: Record<string, unknown>) => Promise<unknown>, revalidate: string[]): Promise<ActionState> {
  const locale = localeFrom(fd);
  const session = await requireUser(locale);
  if (session.ctx?.support) return { ok: false, error: "errors.support.readOnly", nonce: Date.now() };
  if (!(await rateLimit(`platform:${session.user.id}`, 120, 60 * 60_000)).ok) return { ok: false, error: "errors.rateLimited", nonce: Date.now() };
  try {
    await fn(session.user.id, formToObject(fd));
  } catch (e) {
    return toActionError(e);
  }
  for (const p of revalidate) revalidatePath(`/${locale}${p}`, "page");
  return { ok: true, nonce: Date.now() };
}

export async function setVerificationAction(_: ActionState, fd: FormData) {
  const id = s(fd.get("organizationId"));
  return platformAction(fd, (u, i) => platform.setVerification(u, id, i), [`/platform/tenants/${id}`, "/platform/tenants"]);
}
export async function changeSubscriptionAction(_: ActionState, fd: FormData) {
  const id = s(fd.get("organizationId"));
  return platformAction(fd, (u, i) => platform.changeSubscription(u, id, i), [`/platform/tenants/${id}`, "/platform/tenants", "/platform"]);
}
export async function suspendTenantAction(_: ActionState, fd: FormData) {
  const id = s(fd.get("organizationId"));
  return platformAction(fd, (u, i) => platform.suspendTenant(u, id, i), [`/platform/tenants/${id}`, "/platform/tenants", "/platform"]);
}
export async function reactivateTenantAction(_: ActionState, fd: FormData) {
  const id = s(fd.get("organizationId"));
  return platformAction(fd, (u) => platform.reactivateTenant(u, id), [`/platform/tenants/${id}`, "/platform/tenants", "/platform"]);
}
export async function updatePlanAction(_: ActionState, fd: FormData) {
  const code = s(fd.get("code"));
  return platformAction(fd, (u, i) => platform.updatePlan(u, code, i), ["/platform/plans", "/pricing"]);
}
export async function setStaffRoleAction(_: ActionState, fd: FormData) {
  return platformAction(fd, (u, i) => platform.setStaffRole(u, i), ["/platform/staff"]);
}
export async function setUserAccessAction(_: ActionState, fd: FormData) {
  const id = s(fd.get("userId"));
  const org = s(fd.get("organizationId"));
  return platformAction(fd, (u, i) => platform.setUserAccess(u, id, i), ["/platform/staff", ...(org ? [`/platform/tenants/${org}`] : [])]);
}

export async function updateBillingSettingsAction(_: ActionState, fd: FormData) {
  return platformAction(fd, (u, i) => billing.updateBillingSettings(u, i), ["/platform/billing"]);
}
export async function runBillingAction(_: ActionState, fd: FormData) {
  return platformAction(fd, (u) => billing.runBillingAsStaff(u), ["/platform/billing", "/platform"]);
}
export async function recordPlatformPaymentAction(_: ActionState, fd: FormData) {
  const id = s(fd.get("invoiceId"));
  return platformAction(fd, (u, i) => billing.recordPlatformPayment(u, id, i), ["/platform/billing"]);
}
export async function voidPlatformInvoiceAction(_: ActionState, fd: FormData) {
  const id = s(fd.get("invoiceId"));
  return platformAction(fd, (u, i) => billing.voidPlatformInvoice(u, id, i), ["/platform/billing"]);
}
