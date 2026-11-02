import "server-only";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireOrg } from "./auth/session";
import { DomainError } from "./domain/errors";
import { notFound } from "next/navigation";

export async function appPage(params: Promise<{ locale: Locale }>) {
  const { locale } = await params;
  const ctx = await requireOrg(locale);
  return { locale, ctx, d: getDictionary(locale) };
}

/** Converts "not found / not yours" into a 404 so record existence in other tenants is not revealed. */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof DomainError && (e.code === "errors.notFound" || e.code === "errors.forbidden")) notFound();
    throw e;
  }
}
