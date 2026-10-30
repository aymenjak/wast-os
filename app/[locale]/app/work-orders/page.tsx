import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listWorkOrders } from "@/server/services/work-orders";
import { formatDay } from "@/lib/i18n/format";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import type { WorkOrderStatus } from "@/lib/generated/prisma/enums";

const FILTERS: (WorkOrderStatus | "OPEN" | "ALL")[] = ["OPEN", "PLANNED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "FAILED", "DISPUTED", "ALL"];

export default async function WorkOrdersPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ status?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("workorders.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const f = FILTERS.includes(sp.status as WorkOrderStatus) ? (sp.status as (typeof FILTERS)[number]) : "OPEN";
  let rows = await listWorkOrders(ctx, { status: f === "OPEN" || f === "ALL" ? undefined : f });
  if (f === "OPEN") rows = rows.filter((r) => ["PLANNED", "ASSIGNED", "IN_PROGRESS", "DISPUTED"].includes(r.status));
  const field = ctx.role === "FIELD_WORKER";
  return (
    <>
      <PageHeader title={field ? d.workOrders.myWork : d.workOrders.title} />
      <nav aria-label={d.common.filter} className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((x) => (
          <Link key={x} href={`?status=${x}`} aria-current={x === f ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${x === f ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"}`}>
            {x === "ALL" ? d.common.all : x === "OPEN" ? d.civic.open : d.enums.WorkOrderStatus[x]}
          </Link>
        ))}
      </nav>
      {field ? (
        <ul className="space-y-3">
          {rows.length === 0 ? <Card><EmptyState title={d.workOrders.empty} /></Card> : rows.map((o) => (
            <li key={o.id}>
              <Link href={`/${locale}/app/work-orders/${o.id}`} className="block rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 shadow-[var(--shadow-card)] active:bg-ink-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="num font-semibold text-ink-900">{o.number}</span>
                  <StatusBadge status={o.status} label={d.enums.WorkOrderStatus[o.status]} />
                </div>
                <div className="mt-1 text-ink-800">{o.customer?.name ?? o.civicReport?.trackingCode}</div>
                <div className="text-sm text-ink-600">{o.serviceLocation?.addressLine ?? o.civicReport?.addressHint}</div>
                <div className="mt-1 text-xs text-ink-500">{formatDay(o.scheduledDate, locale)}{o.vehicle ? <> · <span className="num">{o.vehicle.plateNumber}</span></> : null}</div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          {rows.length === 0 ? <EmptyState title={d.workOrders.empty} /> : (
            <Table>
              <thead><tr><Th>{d.workOrders.number}</Th><Th>{d.workOrders.kind}</Th><Th>{d.requests.customer}</Th><Th>{d.workOrders.scheduled}</Th><Th>{d.workOrders.team}</Th><Th>{d.workOrders.vehicle}</Th><Th>{d.common.status}</Th></tr></thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-ink-50/60">
                    <Td><Link href={`/${locale}/app/work-orders/${o.id}`} className="num font-medium text-ink-900 hover:underline">{o.number}</Link></Td>
                    <Td>{d.enums.WorkOrderKind[o.kind]}</Td>
                    <Td>{o.customer?.name ?? <span className="num">{o.civicReport?.trackingCode}</span>}<div className="text-xs text-ink-500">{o.serviceLocation?.label ?? o.civicReport?.addressHint}</div></Td>
                    <Td>{formatDay(o.scheduledDate, locale)}</Td>
                    <Td>{o.team?.name ?? <span className="text-ink-500">{d.workOrders.unassigned}</span>}</Td>
                    <Td>{o.vehicle ? <span className="num">{o.vehicle.plateNumber}</span> : "—"}</Td>
                    <Td><StatusBadge status={o.status} label={d.enums.WorkOrderStatus[o.status]} />{o.invoiceLine ? <div className="mt-1 text-xs text-ink-500">{d.workOrders.invoiced}</div> : null}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </>
  );
}
