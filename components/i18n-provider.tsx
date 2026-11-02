"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/translate";

const Ctx = createContext<{ dict: Dictionary; locale: Locale } | null>(null);

export function I18nProvider({ dict, locale, children }: { dict: Dictionary; locale: Locale; children: ReactNode }) {
  return <Ctx.Provider value={{ dict, locale }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("I18nProvider missing");
  return { ...v, t: (key: string, vars?: Record<string, unknown>) => translate(v.dict, key, vars) };
}
