import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatMinor, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { stockReport } from "@/server/services/stock";
import { orgToday } from "@/server/services/reports";
import { Card, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Forbidden, MetricStrip, PageHeader, Stat, Table, Td, Th } from "@/components/ui/misc";
import { StockNav } from "../sub-nav";

const iso = /^\d{4}-\d{2}-\d{2}$/;

export default async function StockReportPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const p = ctx.permissions;
  if (!p.has("fleet.read") && !p.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const today = orgToday(ctx);
  const to = sp.to && iso.test(sp.to) ? sp.to : today;
  const from = sp.from && iso.test(sp.from) ? sp.from : `${today.slice(0, 7)}-01`;
  const s = d.stock;
  const r = await stockReport(ctx, { from: from <= to ? from : to, to });
  const money = (m: number) => formatMinor(m, locale);
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/stock`} className="hover:underline">{s.title}</Link>} title={s.report} description={s.reportLead} />
      <StockNav d={d} locale={locale} current="report" />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm text-ink-700">{d.common.from}<input type="date" name="from" defaultValue={r.from} max={today} className="mt-1 block h-10 rounded-[var(--radius-control)] border border-ink-200 px-3" /></label>
        <label className="text-sm text-ink-700">{d.common.to}<input type="date" name="to" defaultValue={r.to} max={today} className="mt-1 block h-10 rounded-[var(--radius-control)] border border-ink-200 px-3" /></label>
        <button type="submit" className={buttonClass("secondary", "md")}>{d.common.apply}</button>
        {!ctx.support ? <a className={buttonClass("ghost", "md")} href={`/api/exports/stock?format=xlsx&locale=${locale}&from=${r.from}&to=${r.to}`}>{s.exportLedger}</a> : null}
      </form>
      <MetricStrip className="mb-6">
        <Stat label={s.consumed} value={money(r.consumedMinor)} />
        <Stat label={s.purchased} value={money(r.purchasedMinor)} />
        <Stat label={s.stockValue} value={money(r.stockValueMinor)} sub={s.stockValueHint} />
        <Stat label={s.unpaidTotal} value={money(r.unpaid.totalMinor + r.unpaid.vatMinor)} sub={`${r.unpaid.count}`} tone={r.unpaid.count ? "warning" : "default"} />
      </MetricStrip>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={s.byVehicle} />
          {r.byVehicle.length === 0 ? <EmptyState art="workOrders" title={d.common.noData} /> : (
            <Table>
              <thead><tr><Th>{s.vehicle}</Th><Th numeric>{s.consumed}</Th></tr></thead>
              <tbody>{r.byVehicle.map((x) => (
                <tr key={x.vehicle?.id ?? "none"}>
                  <Td>{x.vehicle ? (p.has("fleet.read") ? <Link className="hover:underline" href={`/${locale}/app/fleet/${x.vehicle.id}`}><bdi className="num">{x.vehicle.plateNumber}</bdi> · {x.vehicle.label}</Link> : <span><bdi className="num">{x.vehicle.plateNumber}</bdi> · {x.vehicle.label}</span>) : <span className="text-ink-600">{s.notForVehicle}</span>}</Td>
                  <Td numeric>{money(x.valueMinor)}</Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title={s.byCategory} />
          {r.byCategory.length === 0 ? <EmptyState art="workOrders" title={d.common.noData} /> : (
            <Table>
              <thead><tr><Th>{s.category}</Th><Th numeric>{s.consumed}</Th></tr></thead>
              <tbody>{r.byCategory.map((x) => <tr key={x.category}><Td>{d.enums.StockCategory[x.category]}</Td><Td numeric>{money(x.valueMinor)}</Td></tr>)}</tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title={s.topItems} />
          {r.topItems.length === 0 ? <EmptyState art="workOrders" title={d.common.noData} /> : (
            <Table>
              <thead><tr><Th>{s.item}</Th><Th numeric>{s.quantity}</Th><Th numeric>{s.consumed}</Th></tr></thead>
              <tbody>{r.topItems.map((x) => (
                <tr key={x.item.id}>
                  <Td><Link className="hover:underline" href={`/${locale}/app/stock/${x.item.id}`}>{x.item.name}</Link></Td>
                  <Td numeric><span className="num">{formatNumber(x.qtyMilli / 1000, locale, 3)}</span> {d.enums.StockUnit[x.item.unit]}</Td>
                  <Td numeric>{money(x.valueMinor)}</Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title={s.bySupplier} />
          {r.bySupplier.length === 0 ? <EmptyState art="invoices" title={d.common.noData} /> : (
            <Table>
              <thead><tr><Th>{s.supplier}</Th><Th numeric>{s.purchases}</Th><Th numeric>{s.totalExclVat}</Th></tr></thead>
              <tbody>{r.bySupplier.map((x) => <tr key={x.name}><Td>{x.name}</Td><Td numeric>{x.count}</Td><Td numeric>{money(x.totalMinor)}</Td></tr>)}</tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
