import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError } from "../domain/errors";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { customerSchema, locationSchema } from "./customers";

/**
 * Onboarding: import existing customers and their service locations from a CSV file (Excel → "CSV UTF-8").
 * One row = one customer site; rows with the same NIF (or, without NIF, the same name) become one customer with several
 * sites. Same validation as the forms. Two steps: preview (nothing written) then import, all or nothing. Customers that
 * already exist (same NIF, or same name) are skipped, never overwritten.
 */

export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;

type Field = "name" | "kind" | "taxId" | "email" | "phone" | "billingAddress" | "label" | "addressLine" | "commune" | "wilaya" | "latitude" | "longitude" | "accessNotes";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[ً-ْ]/g, "").toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();

/** Accepted column headers (French, English, Arabic; accents and case ignored). */
const ALIASES: Record<Field, string[]> = {
  name: ["name", "customer", "customer name", "nom", "client", "nom du client", "raison sociale", "الاسم", "اسم الزبون", "الزبون"],
  kind: ["kind", "type", "customer type", "type de client", "النوع", "نوع الزبون"],
  taxId: ["nif", "tax id", "taxid", "tax id nif", "numero fiscal", "الرقم الجبائي"],
  email: ["email", "e mail", "mail", "courriel", "البريد الالكتروني", "البريد"],
  phone: ["phone", "telephone", "tel", "mobile", "الهاتف", "رقم الهاتف"],
  billingAddress: ["billing address", "adresse de facturation", "عنوان الفوترة"],
  label: ["site", "location", "site name", "location label", "nom du site", "site de collecte", "الموقع", "اسم الموقع"],
  addressLine: ["address", "adresse", "site address", "adresse du site", "العنوان", "عنوان الموقع"],
  commune: ["commune", "municipality", "البلدية"],
  wilaya: ["wilaya", "province", "الولاية"],
  latitude: ["latitude", "lat", "خط العرض"],
  longitude: ["longitude", "lng", "lon", "long", "خط الطول"],
  accessNotes: ["access notes", "access", "acces", "notes d acces", "ملاحظات الوصول"],
};
const HEADER: Map<string, Field> = new Map(Object.entries(ALIASES).flatMap(([f, list]) => list.map((a) => [norm(a), f as Field])));

const KINDS: Record<string, "BUSINESS" | "INSTITUTION" | "RESIDENTIAL"> = {
  business: "BUSINESS", entreprise: "BUSINESS", societe: "BUSINESS", company: "BUSINESS", "شركة": "BUSINESS", "مؤسسة تجارية": "BUSINESS",
  institution: "INSTITUTION", administration: "INSTITUTION", public: "INSTITUTION", "مؤسسة": "INSTITUTION", "ادارة": "INSTITUTION",
  residential: "RESIDENTIAL", particulier: "RESIDENTIAL", menage: "RESIDENTIAL", individual: "RESIDENTIAL", "فرد": "RESIDENTIAL", "خاص": "RESIDENTIAL",
};

/** RFC 4180 CSV with auto-detected delimiter (; , or tab — French Excel uses ;). Handles quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = [";", ",", "\t"].map((d) => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0]![0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export type ImportRow = { line: number; name: string; status: "new" | "exists" | "error"; errors: string[]; site: string | null };
export type ImportPreview = { rows: ImportRow[]; customers: number; locations: number; skipped: number; errors: number; unknownColumns: string[]; missingName: boolean };

type Plan = { key: string; customer: ReturnType<typeof customerSchema.parse>; locations: ReturnType<typeof locationSchema.parse>[] };

async function analyse(ctx: OrgContext, csv: string): Promise<{ preview: ImportPreview; plans: Plan[] }> {
  if (Buffer.byteLength(csv, "utf8") > IMPORT_MAX_BYTES) throw new DomainError("errors.import.tooLarge");
  const table = parseCsv(csv);
  if (table.length < 2) throw new DomainError("errors.import.empty");
  if (table.length - 1 > IMPORT_MAX_ROWS) throw new DomainError("errors.import.tooManyRows", { max: IMPORT_MAX_ROWS });
  const header = table[0]!.map((h) => HEADER.get(norm(h)) ?? null);
  const unknownColumns = table[0]!.filter((_, i) => !header[i] && table[0]![i]!.trim()).map((h) => h.trim()).slice(0, 20);
  if (!header.includes("name")) return { preview: { rows: [], customers: 0, locations: 0, skipped: 0, errors: 0, unknownColumns, missingName: true }, plans: [] };

  const existing = await prisma.customer.findMany({ where: { organizationId: ctx.org.id }, select: { name: true, taxId: true } });
  const existingNames = new Set(existing.map((c) => norm(c.name)));
  const existingTax = new Set(existing.filter((c) => c.taxId).map((c) => norm(c.taxId!)));
  const plans = new Map<string, Plan>();
  const rows: ImportRow[] = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const v: Partial<Record<Field, string>> = {};
    header.forEach((f, j) => { if (f && cells[j] != null && cells[j]!.trim() !== "") v[f] = cells[j]!.trim(); });
    const errors: string[] = [];
    const kindRaw = v.kind ? norm(v.kind) : "";
    const kind = kindRaw ? (KINDS[kindRaw] ?? (["BUSINESS", "INSTITUTION", "RESIDENTIAL"].includes(v.kind!.toUpperCase()) ? v.kind!.toUpperCase() : null)) : undefined;
    if (kind === null) errors.push("kind");
    const c = customerSchema.safeParse({ name: v.name ?? "", kind: kind ?? undefined, taxId: v.taxId, email: v.email ?? "", phone: v.phone, billingAddress: v.billingAddress });
    if (!c.success) for (const iss of c.error.issues) errors.push(String(iss.path[0] ?? "name"));
    let loc: Plan["locations"][number] | null = null;
    const hasSite = v.addressLine || v.label || v.commune || v.wilaya || v.latitude || v.longitude;
    if (hasSite) {
      const num = (s?: string) => (s ? s.replace(",", ".") : undefined);
      const l = locationSchema.safeParse({ label: v.label ?? v.commune ?? "Site", addressLine: v.addressLine ?? "", commune: v.commune, wilaya: v.wilaya, latitude: num(v.latitude), longitude: num(v.longitude), accessNotes: v.accessNotes });
      if (l.success) loc = l.data; else for (const iss of l.error.issues) errors.push(String(iss.path[0] ?? "addressLine"));
    }
    const name = v.name ?? "";
    if (errors.length || !c.success) { rows.push({ line, name, status: "error", errors: [...new Set(errors)], site: v.label ?? v.addressLine ?? null }); return; }
    const key = c.data.taxId ? `nif:${norm(c.data.taxId)}` : `name:${norm(c.data.name)}`;
    const exists = (c.data.taxId && existingTax.has(norm(c.data.taxId))) || existingNames.has(norm(c.data.name));
    if (exists) { rows.push({ line, name, status: "exists", errors: [], site: loc?.label ?? null }); return; }
    const plan = plans.get(key) ?? { key, customer: c.data, locations: [] };
    if (loc) plan.locations.push(loc);
    plans.set(key, plan);
    rows.push({ line, name, status: "new", errors: [], site: loc?.label ?? null });
  });
  const all = [...plans.values()];
  return {
    plans: all,
    preview: {
      rows, unknownColumns, missingName: false,
      customers: all.length, locations: all.reduce((n, p) => n + p.locations.length, 0),
      skipped: rows.filter((r) => r.status === "exists").length, errors: rows.filter((r) => r.status === "error").length,
    },
  };
}

/** Step 1: what would be imported, row by row. Writes nothing. */
export async function previewCustomerImport(ctx: OrgContext, csv: string) {
  requirePermission(ctx, "customers.write");
  return (await analyse(ctx, csv)).preview;
}

/** Step 2: imports everything or nothing; refused while any row has an error or if the plan's customer limit would be passed. */
export async function importCustomers(ctx: OrgContext, csv: string) {
  requirePermission(ctx, "customers.write");
  const { preview, plans } = await analyse(ctx, csv);
  if (preview.missingName) throw new DomainError("errors.import.missingName");
  if (preview.errors) throw new DomainError("errors.import.hasErrors", { count: preview.errors });
  if (!plans.length) throw new DomainError("errors.import.nothingNew");
  if (ctx.org.kind === "SERVICE_PROVIDER") {
    const sub = await prisma.subscription.findUnique({ where: { organizationId: ctx.org.id }, include: { plan: true } });
    if (sub?.status === "CANCELLED") throw new DomainError("errors.plan.inactive");
    if (sub && sub.plan.maxCustomers >= 0) {
      const used = await prisma.customer.count({ where: { organizationId: ctx.org.id } });
      if (used + plans.length > sub.plan.maxCustomers) throw new DomainError("errors.plan.limitReached", { resource: "customers", limit: sub.plan.maxCustomers });
    }
  }
  return prisma.$transaction(async (tx) => {
    for (const p of plans) {
      const code = await nextNumber(tx, ctx.org.id, "customer", "CUS", 4);
      const customer = await tx.customer.create({ data: { ...p.customer, code, organizationId: ctx.org.id } });
      if (p.locations.length) {
        await tx.serviceLocation.createMany({
          data: p.locations.map((l) => ({ ...l, latitude: l.latitude?.toFixed(6), longitude: l.longitude?.toFixed(6), organizationId: ctx.org.id, customerId: customer.id })),
        });
      }
    }
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "customer.imported", entityType: "Customer", entityId: "import", data: { customers: preview.customers, locations: preview.locations, skipped: preview.skipped } });
    return { customers: preview.customers, locations: preview.locations, skipped: preview.skipped };
  }, { timeout: 60_000 });
}
