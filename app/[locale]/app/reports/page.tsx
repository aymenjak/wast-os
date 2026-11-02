import type { Locale } from "@/lib/i18n/config";
import { Download } from "lucide-react";
import { appPage } from "@/server/page";
import { businessDashboard, orgToday } from "@/server/services/reports";
import { formatMinor, formatNumber, formatPercent } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Forbidden, PageHeader, Stat, MetricStrip } from "@/components/ui/misc";
import { RankedBars } from "@/components/charts/charts";
import { buttonClass } from "@/components/ui/button";

export default async function ReportsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const to = valid(sp.to) ? sp.to! : orgToday(ctx);
  const from = valid(sp.from) ? sp.from! : `${to.slice(0, 8)}01`;
  const k = await businessDashboard(ctx, { from, to });
  const statuses = Object.entries(k.workOrders.byStatus) as [keyof typeof d.enums.WorkOrderStatus, number][];
  return (
    <>
      <PageHeader title={d.reportsPage.title} />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1"><label htmlFor="from" className="text-xs font-medium text-ink-700">{d.common.from}</label><input id="from" name="from" type="date" defaultValue={from} className="h-9 rounded-md border border-ink-300 px-2 text-sm" /></div>
        <div className="flex flex-col gap-1"><label htmlFor="to" className="text-xs font-medium text-ink-700">{d.common.to}</label><input id="to" name="to" type="date" defaultValue={to} className="h-9 rounded-md border border-ink-300 px-2 text-sm" /></div>
        <button className={buttonClass("secondary", "sm", "h-9")}>{d.common.apply}</button>
        {ctx.support ? null : <div className="ms-auto flex flex-wrap gap-2">
          <a className={buttonClass("subtle", "sm", "h-9")} href={`/api/exports/work-orders?from=${from}&to=${to}`}><Download aria-hidden className="size-4" />{d.reportsPage.workOrdersCsv}</a>
          {ctx.permissions.has("invoices.read") ? <a className={buttonClass("subtle", "sm", "h-9")} href={`/api/exports/invoices?from=${from}&to=${to}`}><Download aria-hidden className="size-4" />{d.reportsPage.invoicesCsv}</a> : null}
        </div>}
      </form>
      <MetricStrip>
        <Stat label={d.dashboard.completionRate} value={k.workOrders.completionRate == null ? "—" : formatPercent(k.workOrders.completionRate, locale)} />
        <Stat label={d.dashboard.failedAttempts} value={formatNumber(k.workOrders.failed, locale)} />
        <Stat label={d.dashboard.invoiced} value={<span className="num">{formatMinor(k.revenue.invoicedMinor, locale, ctx.org.currency)}</span>} />
        <Stat label={d.dashboard.collected} value={<span className="num">{formatMinor(k.revenue.collectedMinor, locale, ctx.org.currency)}</span>} />
      </MetricStrip>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={d.reportsPage.statusBreakdown} />
          <CardBody>{statuses.length ? <RankedBars items={statuses.map(([s, n]) => ({ label: d.enums.WorkOrderStatus[s], value: n, display: formatNumber(n, locale) }))} /> : <p className="text-sm text-ink-500">{d.common.noData}</p>}</CardBody>
        </Card>
        <Card>
          <CardHeader title={d.dashboard.tonnage} />
          <CardBody>{k.tonnage.length ? <RankedBars items={k.tonnage.map((x) => ({ label: x.name, value: x.netKgMinor, display: `${formatNumber(x.netKgMinor / 100 / 1000, locale, 3)} t` }))} /> : <p className="text-sm text-ink-500">{d.common.noData}</p>}</CardBody>
        </Card>
      </div>
    </>
  );
}
