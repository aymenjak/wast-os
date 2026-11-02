import "server-only";
import en, { type Dictionary } from "./dictionaries/en";
import fr from "./dictionaries/fr";
import ar from "./dictionaries/ar";
import type { Locale } from "./config";

const DICTS: Record<Locale, Dictionary> = { en, fr, ar };

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale];
}

export type { Dictionary };
