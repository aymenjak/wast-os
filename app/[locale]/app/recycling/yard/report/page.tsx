import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatMinor, formatNumber, formatPercent } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { orgToday } from "@/server/services/reports";
import { listYards, yardReport } from "@/server/services/yard";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Mass balance and estimated margin per material for one yard and period. */
export default async function YardReport({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ yard?: string; from?: string; to?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const yards = await listYards(ctx);
  const yard = yards.find((x) => x.id === sp.yard) ?? yards[0];
  const y = d.yard;
  if (!yard) return <><PageHeader title={y.report} /><Card><EmptyState art="workOrders" title={y.noYard} hint={y.noYardHint} /></Card></>;
  const to = sp.to && ISO.test(sp.to) ? sp.to : orgToday(ctx);
  const from = sp.from && ISO.test(sp.from) ? sp.from : `${to.slice(0, 7)}-01`;
  const r = await yardReport(ctx, yard.id, { from, to });
  const stream = (s: string) => d.enums.MaterialStream[s as keyof typeof d.enums.MaterialStream];
  const n = (v: number) => formatNumber(v, locale);
  const money = (v: number | null) => (v === null ? "—" : formatMinor(Math.round(v * 100), locale));
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/recycling/yard?yard=${yard.id}`} className="hover:underline">{y.title}</Link>} title={`${y.report} — ${yard.name}`} description={y.reportLead} />
      <form className="mb-6 flex flex-wrap items-end gap-3">
        <input type="hidden" name="yard" value={yard.id} />
        <label className="text-sm text-ink-700">{d.common.from}<input name="from" type="date" defaultValue={from} dir="ltr" className="mt-1 block h-10 rounded-[var(--radius-control)] border border-ink-300 px-3 text-sm" /></label>
        <label className="text-sm text-ink-700">{d.common.to}<input name="to" type="date" defaultValue={to} dir="ltr" className="mt-1 block h-10 rounded-[var(--radius-control)] border border-ink-300 px-3 text-sm" /></label>
        <button className="h-10 rounded-[var(--radius-control)] border border-ink-300 bg-white px-3 text-sm font-medium hover:bg-ink-50">{d.common.apply}</button>
      </form>
      <Card>
        <CardHeader title={y.massBalance} description={y.massBalanceLead} />
        {r.rows.length === 0 ? <EmptyState art="workOrders" title={y.noMovement} /> : (
          <Table scroll>
            <thead><tr><Th>{d.recycling.stream}</Th><Th numeric>{y.collectedKg}</Th><Th numeric>{y.purchasedKg}</Th><Th numeric>{y.openingKg}</Th><Th numeric>{y.baledKg}</Th><Th numeric>{y.rejectKg}</Th><Th numeric>{y.rejectRate}</Th><Th numeric>{y.soldKg}</Th></tr></thead>
            <tbody>{r.rows.map((x) => (
              <tr key={x.stream}><Td>{stream(x.stream)}</Td><Td numeric>{n(x.collectedKg)}</Td><Td numeric>{n(x.purchasedKg)}</Td><Td numeric>{n(x.openingKg)}</Td><Td numeric>{n(x.baledKg)}</Td><Td numeric>{n(x.rejectKg)}</Td><Td numeric>{x.rejectRate === null ? "—" : formatPercent(x.rejectRate, locale)}</Td><Td numeric>{n(x.soldKg)}</Td></tr>
            ))}</tbody>
          </Table>
        )}
        {r.unclassifiedInboundKg > 0 ? <p className="px-5 pb-4 text-sm text-warning-700">{y.unclassifiedInbound}: {n(r.unclassifiedInboundKg)} kg</p> : null}
      </Card>
      <Card className="mt-6">
        <CardHeader title={y.margin} description={y.marginLead} />
        {r.rows.length === 0 ? null : (
          <Table scroll>
            <thead><tr><Th>{d.recycling.stream}</Th><Th numeric>{y.revenue}</Th><Th numeric>{y.purchaseCost}</Th><Th numeric>{y.estimatedCost}</Th><Th numeric>{y.estimatedMargin}</Th></tr></thead>
            <tbody>{r.rows.map((x) => (
              <tr key={x.stream}><Td>{stream(x.stream)}</Td><Td numeric>{money(x.revenue)}</Td><Td numeric>{money(x.purchaseCost)}</Td><Td numeric>{money(x.estimatedCost)}</Td><Td numeric className={x.estimatedMargin !== null && x.estimatedMargin < 0 ? "text-danger-700" : ""}>{money(x.estimatedMargin)}</Td></tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
