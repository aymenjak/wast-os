export const LOCALES = ["ar", "fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** BCP-47 tags used for Intl formatting. ar-DZ keeps Latin digits, matching Algerian usage. */
export const INTL_LOCALE: Record<Locale, string> = { ar: "ar-DZ", fr: "fr-DZ", en: "en-GB" };

export const LOCALE_NAMES: Record<Locale, string> = { ar: "العربية", fr: "Français", en: "English" };
