import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber, formatPercent } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { orgToday } from "@/server/services/reports";
import { territoryReport } from "@/server/services/territory";
import { REFERENCE_TARGETS } from "@/lib/recovery-targets";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Forbidden, MetricStrip, PageHeader, Stat, Table, Td, Th } from "@/components/ui/misc";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";
import { TargetForm } from "./forms";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Territorial report: by commune and wilaya, against the reference targets; printable for one commune. */
export default async function TerritoryPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ from?: string; to?: string; commune?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const to = sp.to && ISO.test(sp.to) ? sp.to : orgToday(ctx);
  const from = sp.from && ISO.test(sp.from) ? sp.from : `${to.slice(0, 4)}-01-01`;
  const commune = sp.commune?.trim() || undefined;
  const r = await territoryReport(ctx, { from, to, commune });
  const tr = d.territory;
  const t = (minor: number) => `⁦${formatNumber(Math.round(minor / 100) / 1000, locale)} t⁩`;
  const pct = (x: number | null) => (x === null ? "—" : formatPercent(x, locale));
  const stream = (k: string) => (k === "NONE" ? d.recycling.unclassified : d.enums.MaterialStream[k as keyof typeof d.enums.MaterialStream]);
  const qs = (o: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ from, to, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/recycling`} className="hover:underline print:hidden">{d.recycling.title}</Link>}
        title={commune ? `${tr.title} — ${commune}` : tr.title}
        description={<>{r.org.legalName ?? r.org.name} · <bdi>{formatDay(from, locale)}</bdi> – <bdi>{formatDay(to, locale)}</bdi></>}
        actions={<div className="flex gap-2 print:hidden"><a className={buttonClass("secondary", "sm")} href={`/api/exports/territory?format=xlsx&from=${from}&to=${to}&locale=${locale}`}>Excel</a><PrintButton /></div>}
      />
      <form className="mb-6 flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm text-ink-700">{d.common.from}<input name="from" type="date" defaultValue={from} dir="ltr" className="mt-1 block h-10 rounded-[var(--radius-control)] border border-ink-300 px-3 text-sm" /></label>
        <label className="text-sm text-ink-700">{d.common.to}<input name="to" type="date" defaultValue={to} dir="ltr" className="mt-1 block h-10 rounded-[var(--radius-control)] border border-ink-300 px-3 text-sm" /></label>
        {commune ? <input type="hidden" name="commune" value={commune} /> : null}
        <button className="h-10 rounded-[var(--radius-control)] border border-ink-300 bg-white px-3 text-sm font-medium hover:bg-ink-50">{d.common.apply}</button>
        {commune ? <Link className="text-sm text-brand-700 hover:underline" href={qs({})}>{tr.allCommunes}</Link> : null}
      </form>
      <Card className="mb-6">
            <CardHeader title={tr.targets} description={tr.targetsLead} />
            <ul className="divide-y divide-ink-100">
              {r.localTarget ? (
                <li className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
                  <span><span className="font-semibold">{formatPercent(r.localTarget.rate, locale)}</span> · {r.localTarget.year} · {r.localTarget.label ?? tr.localTarget}</span>
                  <span className="text-sm text-ink-700">{tr.gap}: <span className="num font-medium">{r.total.rate === null ? "—" : `${((r.total.rate - r.localTarget.rate) * 100).toFixed(1)} pt`}</span></span>
                </li>
              ) : null}
              {REFERENCE_TARGETS.map((x) => (
                <li key={x.id} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3">
                  <span><span className="font-semibold">{formatPercent(x.rate, locale)}</span> · {x.year} · {tr.scope[x.id]} <span className="text-xs text-ink-600">({tr.gradeB})</span></span>
                  <span className="text-sm text-ink-700">{tr.gapMaterial}: <span className="num font-medium">{r.total.materialRate === null ? "—" : `${((r.total.materialRate - x.rate) * 100).toFixed(1)} pt`}</span> · <a className="text-brand-700 underline underline-offset-2 print:hidden" href={x.url} target="_blank" rel="noreferrer">{tr.source}</a></span>
                </li>
              ))}
            </ul>
            {ctx.permissions.has("settings.manage") ? <div className="border-t border-ink-100 px-5 py-4 print:hidden"><TargetForm pct={r.localTarget ? Math.round(r.localTarget.rate * 100) : null} year={r.localTarget?.year ?? null} label={r.localTarget?.label ?? null} /></div> : null}
          </Card>
      {r.tickets === 0 ? <Card><EmptyState art="workOrders" title={d.recycling.noTickets} hint={d.recycling.noTicketsHint} /></Card> : (
        <>
          <MetricStrip className="lg:grid-cols-4">
            <Stat label={tr.handled} value={t(r.total.recovered + r.total.disposed + r.total.untracked)} />
            <Stat label={d.recycling.diversionRate} value={pct(r.total.rate)} sub={tr.rateSub} />
            <Stat label={tr.materialRate} value={pct(r.total.materialRate)} sub={tr.materialRateSub} />
            <Stat label={d.recycling.untracked} value={t(r.total.untracked)} tone={r.total.untracked > 0 ? "warning" : "default"} sub={d.recycling.untrackedHint} />
          </MetricStrip>
          <Card className="mt-6">
            <CardHeader title={tr.byCommune} description={tr.byCommuneLead} />
            <Table scroll>
              <thead><tr><Th>{d.common.wilaya}</Th><Th>{d.common.commune}</Th><Th numeric>{tr.handled}</Th><Th numeric>{d.recycling.recovered}</Th><Th numeric>{d.recycling.diversionRate}</Th><Th numeric>{tr.materialRate}</Th><Th className="print:hidden" /></tr></thead>
              <tbody>{r.communes.map((c) => (
                <tr key={`${c.wilaya}|${c.commune}`}>
                  <Td>{c.wilaya === "—" ? <span className="text-ink-500">{tr.notRecorded}</span> : c.wilaya}</Td>
                  <Td>{c.commune === "—" ? <span className="text-warning-700">{tr.notRecorded}</span> : c.commune}</Td>
                  <Td numeric>{t(c.recovered + c.disposed + c.untracked)}</Td><Td numeric>{t(c.recovered)}</Td><Td numeric>{pct(c.rate)}</Td><Td numeric>{pct(c.materialRate)}</Td>
                  <Td className="text-end print:hidden">{c.commune !== "—" && !commune ? <Link className="text-sm font-medium text-brand-700 hover:underline" href={qs({ commune: c.commune })}>{tr.communeReport}</Link> : null}</Td>
                </tr>
              ))}</tbody>
            </Table>
          </Card>
          {commune && r.communes[0] ? (
            <Card className="mt-6">
              <CardHeader title={d.recycling.byStream} />
              <Table>
                <thead><tr><Th>{d.recycling.stream}</Th><Th numeric>{tr.handled}</Th><Th numeric>{tr.material}</Th><Th numeric>{d.recycling.energy}</Th><Th numeric>{d.recycling.disposed}</Th><Th numeric>{d.recycling.untracked}</Th></tr></thead>
                <tbody>{r.communes.flatMap((c) => c.byStream).map((s, i) => (
                  <tr key={`${s.stream}-${i}`}><Td>{stream(s.stream)}</Td><Td numeric>{t(s.recovered + s.disposed + s.untracked)}</Td><Td numeric>{t(s.recovered - s.energy)}</Td><Td numeric>{t(s.energy)}</Td><Td numeric>{t(s.disposed)}</Td><Td numeric>{t(s.untracked)}</Td></tr>
                ))}</tbody>
              </Table>
            </Card>
          ) : null}
          <p className="mt-6 text-xs text-ink-600">{tr.method}</p>
        </>
      )}
    </>
  );
}
