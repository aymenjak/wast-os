import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError } from "../domain/errors";
import { computeLine, computeTotals } from "../domain/invoice-math";
import { audit } from "../audit";
import { parse } from "../validation";
import { fromMinor, toMinor } from "@/lib/money";
import { PRICING_INCLUDE, recalcInvoice, workOrderLine } from "./invoices";

/**
 * Month-end billing run (D-89): one DRAFT invoice per customer with
 *   - every completed collection not yet invoiced, scheduled up to the last day of the month (late ones included), and
 *   - the monthly flat fees (PER_MONTH contract lines) of contracts in force during the month, once per line and month.
 * Nothing is issued: finance reviews each draft, then issues it as usual. Running it again bills only what is new
 * (work orders are unique on invoice lines; flat fees are unique on line + month). Jobs that cannot be priced are listed
 * with the reason and left out instead of blocking the customer's invoice.
 */

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

function bounds(month: string) {
  const from = new Date(`${month}-01T00:00:00Z`);
  const to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 0));
  return { from, to };
}

type LineData = ReturnType<typeof workOrderLine> | (Omit<ReturnType<typeof workOrderLine>, "workOrderId"> & { workOrderId: null; contractLineId: string; periodMonth: string });

export type MonthlyCustomer = {
  customerId: string;
  name: string;
  collections: number;
  flatFees: number;
  lines: LineData[];
  problems: { number: string; error: string }[];
  subtotalMinor: number;
  totalMinor: number;
};

export async function monthlyBillingPreview(ctx: OrgContext, monthInput: unknown) {
  requirePermission(ctx, "invoices.write");
  const month = parse(monthSchema, monthInput);
  const { from, to } = bounds(month);
  const [orders, fees] = await Promise.all([
    prisma.workOrder.findMany({
      where: { organizationId: ctx.org.id, kind: "COLLECTION", status: "COMPLETED", invoiceLine: null, customerId: { not: null }, scheduledDate: { lte: to } },
      include: { ...PRICING_INCLUDE, customer: { select: { name: true } } },
      orderBy: [{ scheduledDate: "asc" }, { number: "asc" }],
      take: 5000,
    }),
    prisma.contractServiceLine.findMany({
      where: {
        organizationId: ctx.org.id,
        billingUnit: "PER_MONTH",
        invoiceLines: { none: { periodMonth: month } },
        contract: { status: { in: ["ACTIVE", "EXPIRED", "TERMINATED"] }, startDate: { lte: to }, OR: [{ endDate: null }, { endDate: { gte: from } }] },
      },
      include: { contract: { select: { reference: true, customerId: true, customer: { select: { name: true } } } }, serviceLocation: { select: { label: true } }, wasteCategory: { select: { nameFr: true } } },
      orderBy: { id: "asc" },
    }),
  ]);

  const byCustomer = new Map<string, MonthlyCustomer>();
  const entry = (id: string, name: string) => {
    let c = byCustomer.get(id);
    if (!c) byCustomer.set(id, (c = { customerId: id, name, collections: 0, flatFees: 0, lines: [], problems: [], subtotalMinor: 0, totalMinor: 0 }));
    return c;
  };
  for (const fee of fees) {
    const c = entry(fee.contract.customerId, fee.contract.customer.name);
    const unitPriceMinor = toMinor(fee.unitPrice);
    const amounts = computeLine({ quantity: "1", unitPriceMinor, taxRateBps: ctx.org.defaultTaxRateBps });
    c.lines.push({
      organizationId: ctx.org.id,
      description: `${fee.contract.reference} · ${fee.wasteCategory.nameFr} · ${fee.serviceLocation.label} · forfait ${month}`,
      quantity: "1",
      unitPrice: fromMinor(unitPriceMinor),
      taxRateBps: ctx.org.defaultTaxRateBps,
      lineSubtotal: fromMinor(amounts.subtotal),
      lineTax: fromMinor(amounts.tax),
      lineTotal: fromMinor(amounts.total),
      workOrderId: null,
      contractLineId: fee.id,
      periodMonth: month,
    });
    c.flatFees++;
  }
  for (const wo of orders) {
    let line: ReturnType<typeof workOrderLine>;
    try {
      line = workOrderLine(ctx, wo);
    } catch (e) {
      // A monthly-fee site's collections are covered by the fee: not a problem, nothing to bill per job.
      if (e instanceof DomainError && e.code === "errors.invoice.monthlyNotPerWorkOrder") continue;
      if (!(e instanceof DomainError)) throw e;
      entry(wo.customerId!, wo.customer?.name ?? "—").problems.push({ number: wo.number, error: e.code });
      continue;
    }
    const c = entry(wo.customerId!, wo.customer?.name ?? "—");
    c.lines.push(line);
    c.collections++;
  }
  const customers = [...byCustomer.values()]
    .map((c) => {
      const t = computeTotals(c.lines.map((l) => ({ subtotal: toMinor(l.lineSubtotal), tax: toMinor(l.lineTax), total: toMinor(l.lineTotal) })));
      return { ...c, subtotalMinor: t.subtotal, totalMinor: t.total };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return {
    month,
    customers,
    invoiceCount: customers.filter((c) => c.lines.length).length,
    totalMinor: customers.reduce((s, c) => s + c.totalMinor, 0),
  };
}

const runSchema = z.object({ month: monthSchema, customerIds: z.array(z.string().min(1).max(64)).max(2000).optional() });

/** Creates the drafts. Each customer is its own transaction: one conflict (billed meanwhile) skips that customer only. */
export async function runMonthlyBilling(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const data = parse(runSchema, input);
  const preview = await monthlyBillingPreview(ctx, data.month);
  const wanted = data.customerIds ? new Set(data.customerIds) : null;
  const created: { invoiceId: string; customerId: string }[] = [];
  const skipped: string[] = [];
  for (const c of preview.customers) {
    if (!c.lines.length || (wanted && !wanted.has(c.customerId))) continue;
    try {
      const invoiceId = await prisma.$transaction(async (tx) => {
        const woIds = c.lines.map((l) => l.workOrderId).filter((x): x is string => !!x);
        // Still completed and not invoiced since the preview was computed.
        const still = await tx.workOrder.count({ where: { id: { in: woIds }, organizationId: ctx.org.id, status: "COMPLETED", invoiceLine: null } });
        if (still !== woIds.length) throw new DomainError("errors.invoice.alreadyInvoiced");
        const inv = await tx.invoice.create({
          data: { organizationId: ctx.org.id, customerId: c.customerId, currency: ctx.org.currency, notes: `Facturation mensuelle ${data.month}`, createdById: ctx.userId },
        });
        await tx.invoiceLine.createMany({ data: c.lines.map((l, i) => ({ ...l, invoiceId: inv.id, position: i })) });
        await recalcInvoice(tx, ctx.org.id, inv.id);
        await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "invoice.draft_created", entityType: "Invoice", entityId: inv.id, data: { monthlyRun: data.month, collections: c.collections, flatFees: c.flatFees } });
        return inv.id;
      });
      created.push({ invoiceId, customerId: c.customerId });
    } catch (e) {
      const conflict = (e instanceof DomainError && e.code === "errors.invoice.alreadyInvoiced") || (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002");
      if (!conflict) throw e;
      skipped.push(c.customerId);
    }
  }
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "invoice.monthly_run", entityType: "Organization", entityId: ctx.org.id, data: { month: data.month, created: created.length, skipped: skipped.length } });
  return { created, skipped };
}
