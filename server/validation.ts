import { z } from "zod";
import { DomainError } from "./domain/errors";

export const id = z.string().min(1).max(64);
export const optionalText = (max = 2000) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
export const requiredText = (max = 200) => z.string().trim().min(1).max(max);
export const email = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254));
export const password = z.string().min(10).max(200);
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

/** Parse or throw a DomainError carrying field errors (no internal details). */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const issue of r.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.code === "too_small" && issue.minimum === 1 ? "required" : issue.code;
    }
    throw new DomainError("errors.validation", { fields });
  }
  return r.data;
}

export function dateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}
