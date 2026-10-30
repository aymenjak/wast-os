import { INTL_LOCALE, type Locale } from "./config";

type DecimalLike = { toString(): string } | number | string;

export function formatMoney(value: DecimalLike, locale: Locale, currency = "DZD") {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(value.toString()));
}

export function formatMinor(minor: number, locale: Locale, currency = "DZD") {
  return formatMoney(minor / 100, locale, currency);
}

export function formatNumber(value: DecimalLike, locale: Locale, maxFractionDigits = 2) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: maxFractionDigits }).format(Number(value.toString()));
}

export function formatPercent(ratio: number, locale: Locale) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: "percent", maximumFractionDigits: 0 }).format(ratio);
}

/** For timestamptz values: rendered in the organization's timezone. */
export function formatDateTime(d: Date | string | null | undefined, locale: Locale, timeZone = "Africa/Algiers") {
  if (!d) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(d));
}

/** For @db.Date values (stored at UTC midnight): always formatted in UTC so the day never shifts. */
export function formatDay(d: Date | string | null | undefined, locale: Locale) {
  if (!d) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium", timeZone: "UTC" }).format(new Date(d));
}

export function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}
