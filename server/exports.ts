import "server-only";
import writeXlsxFile from "write-excel-file/node";
import { prisma } from "./db";
import { requirePermission, type OrgContext } from "./context";
import { dateOnly } from "./validation";
import { toCsv } from "./services/reports";
import { toMinor } from "@/lib/money";
import { getDictionary } from "@/lib/i18n";
import { recoveryLedger } from "./services/recycling";
import { territoryLedger } from "./services/territory";
import type { Locale } from "@/lib/i18n/config";

export const EXPORT_KINDS = ["work-orders", "invoices", "customers", "containers", "recovery", "territory"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];
type Table = { header: string[]; rows: (string | number | Date | null)[][] };

/** Builds one export table with localized headers and enum labels. Tenant-scoped and permission-checked. */
export async function buildExport(ctx: OrgContext, kind: ExportKind, from: string, to: string, locale: Locale): Promise<Table> {
  const d = getDictionary(locale);
  const cat = (c: { nameAr: string; nameFr: string; nameEn: string } | null) => (c ? (locale === "ar" ? c.nameAr : locale === "fr" ? c.nameFr : c.nameEn) : null);
  const day = (x: Date | null | undefined) => (x ? x.toISOString().slice(0, 10) : null);
  switch (kind) {
    case "work-orders": {
      requirePermission(ctx, "reports.read");
      const rows = await prisma.workOrder.findMany({
        where: { organizationId: ctx.org.id, scheduledDate: { gte: dateOnly(from), lte: dateOnly(to) } },
        include: { customer: true, serviceLocation: true, wasteCategory: true, team: true, vehicle: true, weightTickets: true },
        orderBy: { scheduledDate: "asc" },
      });
      return {
        header: [d.workOrders.number, d.workOrders.kind, d.workOrders.scheduled, d.common.status, d.requests.customer, d.requests.location, d.contracts.category, d.workOrders.team, d.workOrders.vehicle, d.workOrders.netKg, d.workOrders.failureReason],
        rows: rows.map((w) => [
          w.number, d.enums.WorkOrderKind[w.kind], day(w.scheduledDate), d.enums.WorkOrderStatus[w.status], w.customer?.name ?? null, w.serviceLocation?.label ?? null,
          cat(w.wasteCategory), w.team?.name ?? null, w.vehicle?.plateNumber ?? null, w.weightTickets.reduce((s, t) => s + toMinor(t.netKg), 0) / 100,
          w.failureReason ? d.enums.FailureReason[w.failureReason] : null,
        ]),
      };
    }
    case "invoices": {
      requirePermission(ctx, "invoices.read");
      requirePermission(ctx, "reports.read");
      const rows = await prisma.invoice.findMany({
        where: { organizationId: ctx.org.id, status: { not: "DRAFT" }, issueDate: { gte: dateOnly(from), lte: dateOnly(to) } },
        include: { customer: true },
        orderBy: { issueDate: "asc" },
      });
      return {
        header: [d.invoices.number, d.invoices.issueDate, d.invoices.dueDate, d.common.status, d.invoices.customer, d.customers.taxId, d.invoices.subtotal, d.invoices.tax, d.invoices.total, d.invoices.paid, d.invoices.balance],
        rows: rows.map((i) => [
          i.number, day(i.issueDate), day(i.dueDate), d.enums.InvoiceStatus[i.status], i.billToName ?? i.customer.name, i.billToTaxId,
          Number(i.subtotal), Number(i.taxTotal), Number(i.total), Number(i.amountPaid), (toMinor(i.total) - toMinor(i.amountPaid)) / 100,
        ]),
      };
    }
    case "customers": {
      requirePermission(ctx, "customers.read");
      const rows = await prisma.customer.findMany({ where: { organizationId: ctx.org.id }, include: { _count: { select: { locations: true, contracts: true } } }, orderBy: { name: "asc" } });
      return {
        header: [d.customers.code, d.common.name, d.customers.kind, d.customers.taxId, d.common.email, d.common.phone, d.customers.locations, d.contracts.title, d.common.status],
        rows: rows.map((c) => [c.code, c.name, d.enums.CustomerKind[c.kind], c.taxId, c.email, c.phone, c._count.locations, c._count.contracts, d.enums.CustomerStatus[c.status]]),
      };
    }
    case "recovery": {
      // Ticket-level recovery ledger: every figure on the recycling page traces to these lines.
      const rows = await recoveryLedger(ctx, { from, to });
      return {
        header: [d.common.date, d.workOrders.number, d.requests.customer, d.recycling.stream, d.recycling.destination, d.recycling.kind, d.recycling.registrationNumber, d.workOrders.netKg, d.recycling.rejectedKg, d.recycling.contaminated, d.recycling.recovered, d.recycling.disposed, d.recycling.untracked],
        rows: rows.map(({ t, stream, split }) => [
          day(t.weighedAt), t.workOrder.number, t.workOrder.customer?.name ?? null, stream ? d.enums.MaterialStream[stream] : null,
          t.destination?.name ?? null, t.destination ? d.enums.DestinationKind[t.destination.kind] : null, t.destination?.registrationNumber ?? null,
          Number(t.netKg), Number(t.rejectedKg), t.contaminated ? "✓" : "", split.recovered / 100, split.disposed / 100, split.untracked / 100,
        ]),
      };
    }
    case "territory": {
      // Annual indicators by wilaya, commune and material (quantities listed in law 01-19 art. 33 bis 2). NEXVO format —
      // the official SNID/AND format has not been obtained, so this is not presented as an official declaration.
      const rows = await territoryLedger(ctx, from, to);
      const stream = (k: string) => (k === "NONE" ? d.recycling.unclassified : d.enums.MaterialStream[k as keyof typeof d.enums.MaterialStream]);
      return {
        header: [d.common.wilaya, d.common.commune, d.recycling.stream, d.territory.totalKg, d.territory.materialKg, d.territory.energyKg, d.territory.disposedKg, d.territory.untrackedKg],
        rows: rows.map((r) => [r.wilaya, r.commune, stream(r.stream), r.totalKg, r.materialKg, r.energyKg, r.disposedKg, r.untrackedKg]),
      };
    }
    case "containers": {
      requirePermission(ctx, "fleet.read");
      const rows = await prisma.container.findMany({ where: { organizationId: ctx.org.id }, include: { serviceLocation: { include: { customer: true } } }, orderBy: { code: "asc" } });
      return {
        header: [d.containers.code, d.containers.type, d.containers.status, d.requests.customer, d.containers.location, d.containers.since],
        rows: rows.map((c) => [c.code, d.enums.ContainerType[c.type], d.enums.ContainerStatus[c.status], c.serviceLocation?.customer.name ?? null, c.serviceLocation?.label ?? null, day(c.placedAt)]),
      };
    }
  }
}

export function tableToCsv(t: Table) {
  return toCsv(t.header, t.rows.map((r) => r.map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))));
}

/** XLSX with a bold sticky header; right-to-left sheet for Arabic. Text cells are written as strings (no formula evaluation). */
export async function tableToXlsx(t: Table, sheetName: string, locale: Locale): Promise<Buffer> {
  const header = t.header.map((h) => ({ value: h, fontWeight: "bold" as const }));
  const body = t.rows.map((r) => r.map((v) => (v == null ? null : typeof v === "number" ? { value: v, type: Number } : { value: String(v), type: String })));
  return writeXlsxFile([header, ...body], {
    sheet: sheetName.slice(0, 31),
    stickyRowsCount: 1,
    rightToLeft: locale === "ar",
    columns: t.header.map((h) => ({ width: Math.min(40, Math.max(12, h.length + 4)) })),
  }).toBuffer();
}
