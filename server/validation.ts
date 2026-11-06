import { z } from "zod";
import { DomainError } from "./domain/errors";

export const id = z.string().min(1).max(64);
export const optionalText = (max = 2000) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
export const requiredText = (max = 200) => z.string().trim().min(1).max(max);
export const email = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254));
/** Keyboard runs and stock phrases that pass a length check (compared lower-case, digits and separators kept). */
const COMMON_PASSWORDS = new Set([
  "1234567890", "12345678910", "0123456789", "azertyuiop", "qwertyuiop", "motdepasse", "motdepasse123", "password123",
  "password1234", "passwordpassword", "azerty12345", "qwerty12345", "abcdefghij", "1q2w3e4r5t", "nexvo12345",
]);

/** New passwords (sign-up, reset, invitation): length, at least 5 different characters, not a stock phrase. */
export const password = z
  .string()
  .min(10)
  .max(200)
  .refine((v) => new Set(v).size >= 5 && !COMMON_PASSWORDS.has(v.toLowerCase()), "weakPassword");
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const money = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().replace(",", "."))
  .pipe(z.string().regex(/^\d{1,12}(\.\d{1,2})?$/));
export const quantity = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().replace(",", "."))
  .pipe(z.string().regex(/^\d{1,9}(\.\d{1,3})?$/))
  .refine((v) => Number(v) > 0);
export const latitude = z.coerce.number().min(-90).max(90);
export const longitude = z.coerce.number().min(-180).max(180);

/** Algeria's bounding box with a small margin: a site outside it is a typing or GPS error (a swapped pair, a site abroad). */
export const ALGERIA_BOUNDS = { minLat: 18.9, maxLat: 37.6, minLng: -8.7, maxLng: 12.0 } as const;
export const algeriaLatitude = latitude.refine((v) => v >= ALGERIA_BOUNDS.minLat && v <= ALGERIA_BOUNDS.maxLat, "outsideAlgeria");
export const algeriaLongitude = longitude.refine((v) => v >= ALGERIA_BOUNDS.minLng && v <= ALGERIA_BOUNDS.maxLng, "outsideAlgeria");

const blank = (v: unknown) => typeof v === "string" && v.trim() === "";

/** NIF: digits only once spaces, dots and dashes are removed (15 digits, longer forms up to 20 are accepted). */
export const optionalTaxId = z.preprocess(
  (v) => (blank(v) ? undefined : typeof v === "string" ? v.replace(/[\s.-]/g, "") : v),
  z.string().refine((v) => /^\d{15,20}$/.test(v), "taxId").optional(),
);

/** Phone: an Algerian number (0…, +213…, 00213…) or an international one (+ and 8 to 15 digits); separators allowed. */
export const optionalPhone = z.preprocess(
  (v) => (blank(v) ? undefined : v),
  z
    .string()
    .trim()
    .max(40)
    .refine((v) => {
      const digits = v.replace(/[\s.()-]/g, "");
      return /^(?:\+213|00213|0)[1-9]\d{7,8}$/.test(digits) || /^\+[1-9]\d{7,14}$/.test(digits);
    }, "phone")
    .optional(),
);

/** Field error codes the forms translate (errors.field.*) when a refinement names one. */
const FIELD_CODES = new Set(["outsideAlgeria", "taxId", "phone", "weakPassword", "privacyConsent"]);

/** Parse or throw a DomainError carrying field errors (no internal details). */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??=
        issue.code === "custom" && FIELD_CODES.has(issue.message) ? issue.message
        : issue.code === "too_small" && issue.minimum === 1 ? "required"
        : issue.code;
    }
    throw new DomainError("errors.validation", { fields });
  }
  return r.data;
}

export function dateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}
