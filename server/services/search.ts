import { prisma } from "../db";
import { hasPermission, type OrgContext } from "../context";

export type SearchHit = { type: "customer" | "workOrder" | "invoice" | "contract" | "container" | "civicReport"; id: string; title: string; subtitle?: string; href: string };

/** Tenant-scoped quick search for the command palette. Each group is gated by the matching read permission. */
export async function globalSearch(ctx: OrgContext, rawQuery: string, locale: string): Promise<SearchHit[]> {
  const q = rawQuery.trim().slice(0, 60);
  if (q.length < 2) return [];
  const org = ctx.org.id;
  // Prisma `contains` does not escape LIKE wildcards; escape them so "%" and "_" are literal.
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const like = { contains: escaped, mode: "insensitive" as const };
  const base = `/${locale}/app`;
  const tasks: Promise<SearchHit[]>[] = [];

  // LIKE pattern with wildcards escaped; names compared accent- and case-insensitively.
  const pattern = `%${escaped}%`;
  if (hasPermission(ctx, "customers.read"))
    tasks.push(prisma.$queryRaw<{ id: string; name: string; code: string }[]>`
      SELECT "id", "name", "code" FROM "Customer"
      WHERE "organizationId" = ${org} AND (nexvo_fold("name") LIKE nexvo_fold(${pattern}) OR "code" ILIKE ${pattern} OR "taxId" ILIKE ${pattern})
      ORDER BY "name" LIMIT 5`
      .then((r) => r.map((c) => ({ type: "customer" as const, id: c.id, title: c.name, subtitle: c.code, href: `${base}/customers/${c.id}` }))));
  if (hasPermission(ctx, "workorders.read") && ctx.role !== "FIELD_WORKER")
    tasks.push(prisma.$queryRaw<{ id: string; number: string; customer: string | null }[]>`
      SELECT w."id", w."number", c."name" AS customer FROM "WorkOrder" w
      LEFT JOIN "Customer" c ON c."id" = w."customerId" AND c."organizationId" = w."organizationId"
      WHERE w."organizationId" = ${org} AND (w."number" ILIKE ${pattern} OR nexvo_fold(c."name") LIKE nexvo_fold(${pattern}))
      ORDER BY w."scheduledDate" DESC LIMIT 5`
      .then((r) => r.map((w) => ({ type: "workOrder" as const, id: w.id, title: w.number, subtitle: w.customer ?? undefined, href: `${base}/work-orders/${w.id}` }))));
  if (hasPermission(ctx, "invoices.read"))
    tasks.push(prisma.invoice.findMany({ where: { organizationId: org, OR: [{ number: like }, { customer: { name: like } }] }, take: 5, select: { id: true, number: true, customer: { select: { name: true } } } })
      .then((r) => r.map((i) => ({ type: "invoice" as const, id: i.id, title: i.number ?? "—", subtitle: i.customer.name, href: `${base}/invoices/${i.id}` }))));
  if (hasPermission(ctx, "contracts.read"))
    tasks.push(prisma.contract.findMany({ where: { organizationId: org, OR: [{ reference: like }, { title: like }] }, take: 5, select: { id: true, reference: true, title: true } })
      .then((r) => r.map((c) => ({ type: "contract" as const, id: c.id, title: c.reference, subtitle: c.title, href: `${base}/contracts/${c.id}` }))));
  if (hasPermission(ctx, "fleet.read"))
    tasks.push(prisma.container.findMany({ where: { organizationId: org, code: like }, take: 5, select: { id: true, code: true } })
      .then((r) => r.map((c) => ({ type: "container" as const, id: c.id, title: c.code, href: `${base}/containers/${c.id}` }))));
  if (hasPermission(ctx, "civic.read"))
    tasks.push(prisma.civicReport.findMany({ where: { organizationId: org, OR: [{ trackingCode: like }, { addressHint: like }] }, take: 5, select: { id: true, trackingCode: true, addressHint: true } })
      .then((r) => r.map((c) => ({ type: "civicReport" as const, id: c.id, title: c.trackingCode, subtitle: c.addressHint ?? undefined, href: `${base}/civic/reports/${c.id}` }))));

  return (await Promise.all(tasks)).flat();
}
