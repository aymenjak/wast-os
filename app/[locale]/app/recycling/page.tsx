import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { recoveryReport } from "@/server/services/recycling";
import { orgToday } from "@/server/services/reports";
import { formatNumber, formatPercent } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, MetricStrip, PageHeader, Stat, Table, Td, Th } from "@/components/ui/misc";
import { ColumnChart } from "@/components/charts/column-chart";
import { DataTableToggle, Legend, RankedBars } from "@/components/charts/charts";
import { CHART } from "@/components/charts/palette";
import { buttonClass } from "@/components/ui/button";

type SP = { from?: string; to?: string };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function RecyclingPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const { locale, ctx, d } = await appPage(params);
  const sp = await searchParams;
  const to = sp.to && ISO.test(sp.to) ? sp.to : orgToday(ctx);
  const from = sp.from && ISO.test(sp.from) ? sp.from : new Date(new Date(`${to}T00:00:00Z`).getTime() - 89 * 86400_000).toISOString().slice(0, 10);
  const r = await orNotFound(recoveryReport(ctx, { from, to }));
  const t = (minor: number) => formatNumber(Math.round(minor / 100) / 1000, locale);
  // "3,86 t" stays in that order inside Arabic text (left-to-right isolate).
  const tt = (minor: number) => `\u2066${t(minor)}\u00a0t\u2069`;
  const pct = (x: number | null) => (x === null ? "—" : formatPercent(x, locale));
  const stream = (k: string) => (k === "NONE" ? d.recycling.unclassified : d.enums.MaterialStream[k as keyof typeof d.enums.MaterialStream]);
  return (
    <>
      <PageHeader title={d.recycling.title} description={d.recycling.lead}
        actions={<div className="flex flex-wrap gap-2">
          <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/territory`}>{d.territory.title}</Link>
          <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/campaigns`}>{d.territory.campaigns}</Link>
          <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/drop-off`}>{d.territory.dropOff}</Link>
          <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/yard`}>{d.yard.title}</Link>
          <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/hazardous`}>{d.hazardous.title}</Link>
          {ctx.permissions.has("settings.manage") ? <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/destinations`}>{d.recycling.destinations}</Link> : null}
          <a className={buttonClass("subtle", "sm")} href={`/api/exports/recovery?format=xlsx&locale=${locale}&from=${from}&to=${to}`}>Excel</a>
          <a className={buttonClass("subtle", "sm")} href={`/api/exports/recovery?format=csv&locale=${locale}&from=${from}&to=${to}`}>CSV</a>
        </div>} />
      <form className="mb-6 flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1">{d.common.from}<input type="date" name="from" defaultValue={from} className="h-9 rounded-md border border-ink-300 px-2" /></label>
        <label className="flex flex-col gap-1">{d.common.to}<input type="date" name="to" defaultValue={to} className="h-9 rounded-md border border-ink-300 px-2" /></label>
        <button className={buttonClass("secondary", "sm", "h-9")}>{d.common.apply}</button>
      </form>
      {r.tickets === 0 ? <Card><EmptyState art="workOrders" title={d.recycling.noTickets} hint={d.recycling.noTicketsHint} /></Card> : (
        <>
          <MetricStrip className="lg:grid-cols-4">
            <Stat label={d.recycling.diversionRate} value={pct(r.rate)} sub={d.recycling.rateRule} />
            <Stat label={d.recycling.recovered} value={tt(r.total.recovered)} sub={r.total.energy > 0 ? `${d.recycling.energyShare}: ${tt(r.total.energy)}` : undefined} />
            <Stat label={d.recycling.disposed} value={tt(r.total.disposed)} />
            <Stat label={d.recycling.untracked} value={tt(r.total.untracked)} tone={r.total.untracked > 0 ? "warning" : "default"} sub={d.recycling.untrackedHint} />
          </MetricStrip>
          {r.organicElsewhere > 0 ? (
            <p role="status" className="mt-4 rounded-[var(--radius-card)] border border-warning-700/30 bg-warning-100 px-4 py-3 text-sm text-warning-700">
              <span className="font-semibold">{d.recycling.organicElsewhere}: {tt(r.organicElsewhere)}</span>
              <span className="mt-0.5 block text-ink-800">{d.recycling.organicElsewhereHint}</span>
            </p>
          ) : null}
          <Card className="mt-6">
            <CardHeader title={d.recycling.byMonth} action={<Legend items={[{ name: d.recycling.recovered, color: CHART.completed }, { name: d.recycling.notRecovered, color: CHART.neutral }]} />} />
            <CardBody>
              <ColumnChart ariaLabel={d.recycling.byMonth} showMax maxUnit="t" columns={r.byMonth.map((m) => ({
                key: m.month, label: m.month,
                segments: [
                  { name: d.recycling.recovered, value: Math.round(m.recovered / 10_000) / 10, color: CHART.completed, display: tt(m.recovered) },
                  { name: d.recycling.notRecovered, value: Math.round((m.disposed + m.untracked) / 10_000) / 10, color: CHART.neutral, display: tt(m.disposed + m.untracked) },
                ],
              }))} />
              <DataTableToggle label={d.dashboard.showTable}>
                <table className="w-full text-sm"><tbody>{r.byMonth.map((m) => <tr key={m.month} className="border-t border-ink-100"><td className="py-1 num">{m.month}</td><td className="num text-end">{tt(m.recovered)}</td><td className="num text-end">{tt(m.disposed + m.untracked)}</td><td className="num text-end">{pct(m.rate)}</td></tr>)}</tbody></table>
              </DataTableToggle>
            </CardBody>
          </Card>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={d.recycling.byStream} description={d.recycling.recoveredTonnes} />
              <CardBody><RankedBars items={r.byStream.map((s) => ({ label: `${stream(s.key)} · ${pct(s.rate)}`, value: s.recovered, display: `\u2066${t(s.recovered)} / ${t(s.recovered + s.disposed + s.untracked)}\u00a0t\u2069` }))} /></CardBody>
            </Card>
            <Card>
              <CardHeader title={d.recycling.byDestination} />
              <Table>
                <thead><tr><Th>{d.recycling.destination}</Th><Th>{d.recycling.kind}</Th><Th numeric>t</Th></tr></thead>
                <tbody>{r.byDestination.map((x) => {
                  const dest = x.key === "NONE" ? null : r.destinations[x.key];
                  return <tr key={x.key}><Td>{dest ? dest.name : <span className="text-warning-700">{d.recycling.untracked}</span>}{dest?.registrationNumber ? <div className="num text-xs text-ink-600">{dest.registrationNumber}</div> : null}</Td><Td>{dest ? d.enums.DestinationKind[dest.kind] : "—"}</Td><Td numeric>{t(x.recovered + x.disposed + x.untracked)}</Td></tr>;
                })}</tbody>
              </Table>
            </Card>
          </div>
          <Card className="mt-6">
            <CardHeader title={d.recycling.byCustomer} />
            <Table>
              <thead><tr><Th>{d.requests.customer}</Th><Th numeric>{d.recycling.recovered}</Th><Th numeric>{d.recycling.diversionRate}</Th><Th /></tr></thead>
              <tbody>{r.byCustomer.map((c) => (
                <tr key={c.id}><Td>{c.name}</Td><Td numeric>{tt(c.recovered)}</Td><Td numeric>{pct(c.rate)}</Td>
                  <Td className="text-end"><Link className="text-sm font-medium text-brand-700 hover:underline" href={`/${locale}/app/customers/${c.id}/recovery?month=${to.slice(0, 7)}`}>{d.recycling.certificate}</Link></Td></tr>
              ))}</tbody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
