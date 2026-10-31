import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { dateOnly } from "../validation";
import { toMinor } from "@/lib/money";

/** "Today" in the organization's timezone, as YYYY-MM-DD. */
export function orgToday(ctx: OrgContext, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ctx.org.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export async function businessDashboard(ctx: OrgContext, period: { from: string; to: string }) {
  requirePermission(ctx, "reports.read");
  const org = ctx.org.id;
  const today = dateOnly(orgToday(ctx));
  const from = dateOnly(period.from);
  const to = dateOnly(period.to);

  const [statusCounts, todayCounts, overdue, failedByReason, tonnage, receivables, overdueInvoices, invoiced, collected, vehicles, pendingRequests] =
    await Promise.all([
      prisma.workOrder.groupBy({ by: ["status"], where: { organizationId: org, scheduledDate: { gte: from, lte: to } }, _count: true }),
      prisma.workOrder.groupBy({ by: ["status"], where: { organizationId: org, scheduledDate: today }, _count: true }),
      prisma.workOrder.count({ where: { organizationId: org, scheduledDate: { lt: today }, status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] } } }),
      prisma.workOrder.groupBy({ by: ["failureReason"], where: { organizationId: org, status: "FAILED", scheduledDate: { gte: from, lte: to } }, _count: true }),
      prisma.$queryRaw<{ code: string; name: string; net_kg: string }[]>`
        SELECT c."code", c."nameFr" AS name, COALESCE(SUM(t."netKg"), 0)::text AS net_kg
        FROM "WeightTicket" t
        JOIN "WorkOrder" w ON w."id" = t."workOrderId"
        JOIN "WasteCategory" c ON c."id" = w."wasteCategoryId"
        WHERE t."organizationId" = ${org} AND w."scheduledDate" BETWEEN ${from} AND ${to}
        GROUP BY c."code", c."nameFr" ORDER BY SUM(t."netKg") DESC`,
      prisma.invoice.aggregate({ where: { organizationId: org, status: { in: ["ISSUED", "PARTIALLY_PAID"] } }, _sum: { total: true, amountPaid: true }, _count: true }),
      prisma.invoice.count({ where: { organizationId: org, status: { in: ["ISSUED", "PARTIALLY_PAID"] }, dueDate: { lt: today } } }),
      prisma.invoice.aggregate({ where: { organizationId: org, status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] }, issueDate: { gte: from, lte: to } }, _sum: { total: true } }),
      prisma.payment.aggregate({ where: { organizationId: org, status: "RECORDED", receivedAt: { gte: from, lte: new Date(to.getTime() + 86400_000) } }, _sum: { amount: true } }),
      prisma.$queryRaw<{ plate: string; label: string; jobs: bigint; days: bigint }[]>`
        SELECT v."plateNumber" AS plate, v."label", count(w."id") AS jobs, count(DISTINCT w."scheduledDate") AS days
        FROM "Vehicle" v
        LEFT JOIN "WorkOrder" w ON w."vehicleId" = v."id" AND w."status" = 'COMPLETED' AND w."scheduledDate" BETWEEN ${from} AND ${to}
        WHERE v."organizationId" = ${org} AND v."status" <> 'RETIRED'
        GROUP BY v."plateNumber", v."label" ORDER BY jobs DESC`,
      prisma.collectionRequest.count({ where: { organizationId: org, status: "SUBMITTED" } }),
    ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Record<string, number>;
  const todayByStatus = Object.fromEntries(todayCounts.map((s) => [s.status, s._count])) as Record<string, number>;
  const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400_000) + 1);
  const outstandingMinor = toMinor(receivables._sum.total ?? 0) - toMinor(receivables._sum.amountPaid ?? 0);
  const completed = byStatus.COMPLETED ?? 0;
  const failed = byStatus.FAILED ?? 0;

  return {
    period: { ...period, days: periodDays },
    workOrders: { byStatus, today: todayByStatus, overdue, completed, failed, completionRate: completed + failed > 0 ? completed / (completed + failed) : null },
    failedByReason: failedByReason.map((f) => ({ reason: f.failureReason ?? "OTHER", count: f._count })),
    tonnage: tonnage.map((t) => ({ code: t.code, name: t.name, netKgMinor: toMinor(t.net_kg) })),
    receivables: { outstandingMinor, openCount: receivables._count, overdueCount: overdueInvoices },
    revenue: { invoicedMinor: toMinor(invoiced._sum.total ?? 0), collectedMinor: toMinor(collected._sum.amount ?? 0) },
    vehicles: vehicles.map((v) => ({ plate: v.plate, label: v.label, jobs: Number(v.jobs), activeDays: Number(v.days), utilization: Number(v.days) / periodDays })),
    pendingRequests,
  };
}

function csvCell(v: unknown): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Neutralise spreadsheet formula injection (OWASP CSV injection guidance).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export async function exportWorkOrdersCsv(ctx: OrgContext, from: string, to: string) {
  requirePermission(ctx, "reports.read");
  const rows = await prisma.workOrder.findMany({
    where: { organizationId: ctx.org.id, scheduledDate: { gte: dateOnly(from), lte: dateOnly(to) } },
    include: { customer: true, serviceLocation: true, wasteCategory: true, team: true, vehicle: true, weightTickets: true },
    orderBy: { scheduledDate: "asc" },
  });
  return toCsv(
    ["number", "kind", "scheduled_date", "status", "customer", "location", "category", "team", "vehicle", "net_kg", "failure_reason", "completed_at"],
    rows.map((w) => [
      w.number, w.kind, w.scheduledDate.toISOString().slice(0, 10), w.status, w.customer?.name, w.serviceLocation?.label,
      w.wasteCategory?.code, w.team?.name, w.vehicle?.plateNumber,
      (w.weightTickets.reduce((s, t) => s + toMinor(t.netKg), 0) / 100).toFixed(2), w.failureReason, w.actualEnd,
    ]),
  );
}

export async function exportInvoicesCsv(ctx: OrgContext, from: string, to: string) {
  requirePermission(ctx, "invoices.read");
  requirePermission(ctx, "reports.read");
  const rows = await prisma.invoice.findMany({
    where: { organizationId: ctx.org.id, status: { not: "DRAFT" }, issueDate: { gte: dateOnly(from), lte: dateOnly(to) } },
    include: { customer: true },
    orderBy: { issueDate: "asc" },
  });
  return toCsv(
    ["number", "issue_date", "due_date", "status", "customer", "customer_nif", "subtotal", "tax", "total", "paid", "balance", "currency"],
    rows.map((i) => [
      i.number, i.issueDate?.toISOString().slice(0, 10), i.dueDate?.toISOString().slice(0, 10), i.status, i.billToName ?? i.customer.name,
      i.billToTaxId, i.subtotal.toString(), i.taxTotal.toString(), i.total.toString(), i.amountPaid.toString(),
      ((toMinor(i.total) - toMinor(i.amountPaid)) / 100).toFixed(2), i.currency,
    ]),
  );
}

/** Completed vs failed work orders per day for the last `days` days (org-local calendar). */
export async function dailyTrend(ctx: OrgContext, days = 14) {
  requirePermission(ctx, "reports.read");
  const to = orgToday(ctx);
  const from = new Date(new Date(`${to}T00:00:00Z`).getTime() - (days - 1) * 86400_000).toISOString().slice(0, 10);
  const rows = await prisma.workOrder.groupBy({
    by: ["scheduledDate", "status"],
    where: { organizationId: ctx.org.id, scheduledDate: { gte: dateOnly(from), lte: dateOnly(to) }, status: { in: ["COMPLETED", "FAILED"] } },
    _count: true,
  });
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(new Date(`${from}T00:00:00Z`).getTime() + i * 86400_000).toISOString().slice(0, 10);
    const of = (s: string) => rows.find((r) => r.scheduledDate.toISOString().slice(0, 10) === day && r.status === s)?._count ?? 0;
    return { day, completed: of("COMPLETED"), failed: of("FAILED") };
  });
}
