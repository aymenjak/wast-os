import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { homeFor } from "@/server/navigation";
import { businessDashboard, dailyTrend, orgToday, receivablesAging, type AgingBucket } from "@/server/services/reports";
import { contractsDueForRenewal } from "@/server/services/contracts";
import { aiEnabled } from "@/server/services/ai";
import { iotKpis } from "@/server/services/iot";
import { prisma } from "@/server/db";
import { formatDateTime, formatDay, formatMinor, formatNumber, formatPercent } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, MetricStrip, PageHeader, Stat } from "@/components/ui/misc";
import { ColumnChart } from "@/components/charts/column-chart";
import { DataTableToggle, Legend, Meter, RankedBars } from "@/components/charts/charts";
import { CHART } from "@/components/charts/palette";
import { AiBrief } from "@/components/ai-brief";

/*
 * Dashboard layout follows common KPI-dashboard guidance (decisions first, 4–6 headline KPIs,
 * trend, then breakdowns) and the dataviz skill (form before colour, validated palette,
 * hover + table view on every chart). See DESIGN-SYSTEM.md → Data visualisation.
 */
export default async function Dashboard({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  const home = homeFor(ctx, locale);
  if (home) redirect(home);
  if (!ctx.permissions.has("reports.read")) redirect(`/${locale}/app/work-orders`);

  const to = orgToday(ctx);
  const from = new Date(new Date(`${to}T00:00:00Z`).getTime() - 29 * 86400_000).toISOString().slice(0, 10);
  const canInvoices = ctx.permissions.has("invoices.read");
  const [k, renewals, counts, trend, aging, iot] = await Promise.all([
    businessDashboard(ctx, { from, to }),
    contractsDueForRenewal(ctx),
    Promise.all([
      prisma.customer.count({ where: { organizationId: ctx.org.id } }),
      prisma.contract.count({ where: { organizationId: ctx.org.id } }),
      prisma.team.count({ where: { organizationId: ctx.org.id } }),
      prisma.collectionRequest.count({ where: { organizationId: ctx.org.id } }),
    ]),
    dailyTrend(ctx, 14),
    canInvoices ? receivablesAging(ctx) : Promise.resolve(null),
    iotKpis(ctx),
  ]);
  const [nCustomers, nContracts, nTeams, nRequests] = counts;
  const onboarding = [
    [nCustomers > 0, d.dashboard.stepCustomer, "/app/customers/new"],
    [nContracts > 0, d.dashboard.stepContract, "/app/contracts/new"],
    [nTeams > 0, d.dashboard.stepTeam, "/app/fleet"],
    [nRequests > 0, d.dashboard.stepRequest, "/app/requests/new"],
  ] as const;
  const t = k.workOrders.today;
  const planned = (t.PLANNED ?? 0) + (t.ASSIGNED ?? 0) + (t.IN_PROGRESS ?? 0) + (t.COMPLETED ?? 0) + (t.FAILED ?? 0);
  const done = t.COMPLETED ?? 0;
  const money = (m: number) => <span className="num">{formatMinor(m, locale, ctx.org.currency)}</span>;
  const dayLabel = (day: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-DZ" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  const agingKeys: AgingBucket[] = ["NOT_DUE", "D1_30", "D31_60", "D61_90", "D90_PLUS"];
  const agingColor = (b: AgingBucket) => (b === "NOT_DUE" ? CHART.neutral : CHART.agingRamp[agingKeys.indexOf(b) - 1]!);

  return (
    <>
      <PageHeader title={d.dashboard.title} description={<><bdi>{ctx.org.name}</bdi> · <bdi>{formatDay(to, locale)}</bdi></>} />

      {onboarding.some(([ok]) => !ok) ? (
        <Card className="mb-6">
          <CardHeader title={d.dashboard.gettingStarted} />
          <CardBody>
            <ol className="grid gap-2 sm:grid-cols-2">
              {onboarding.map(([ok, label, href]) => (
                <li key={href}>
                  <Link href={`/${locale}${href}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-ink-50">
                    {ok ? <CheckCircle2 aria-hidden className="size-4 text-success-700" /> : <Circle aria-hidden className="size-4 text-ink-500" />}
                    <span className={ok ? "text-ink-500 line-through" : "text-ink-800"}>{label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ) : null}

      {/* Hero: the one number the operations day is about. */}
      <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white px-5 py-5">
          <h2 className="text-sm text-ink-600">{d.dashboard.progress}</h2>
          <p className="display num mt-2 text-[3.4rem] leading-none font-bold text-ink-950">
            {formatNumber(done, locale)}<span className="text-2xl text-ink-500"> / {formatNumber(planned, locale)}</span>
          </p>
          <div className="mt-4">
            <Meter value={done} max={Math.max(planned, 1)} label={d.dashboard.progressOf.replace("{done}", formatNumber(done, locale)).replace("{planned}", formatNumber(planned, locale))} display={planned ? formatPercent(done / planned, locale) : "—"} />
          </div>
        </div>
        <MetricStrip className="lg:grid-cols-2">
          <Stat label={d.dashboard.inProgress} value={formatNumber(t.IN_PROGRESS ?? 0, locale)} />
          <Stat label={d.dashboard.overdue} value={formatNumber(k.workOrders.overdue, locale)} tone={k.workOrders.overdue > 0 ? "danger" : "default"} />
          <Stat label={d.dashboard.pendingRequests} value={formatNumber(k.pendingRequests, locale)} tone={k.pendingRequests > 0 ? "warning" : "default"} />
          <Stat label={d.dashboard.completionRate} value={k.workOrders.completionRate == null ? "—" : formatPercent(k.workOrders.completionRate, locale)} sub={`${formatNumber(k.workOrders.failed, locale)} ${d.dashboard.failedAttempts.toLowerCase()} (${d.dashboard.period.toLowerCase()})`} />
        </MetricStrip>
      </section>

      {ctx.permissions.has("reports.read") && aiEnabled() ? <div className="mt-4"><AiBrief /></div> : null}

      <section className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white px-5 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-ink-900">{d.trend.title}</h2>
          <Legend items={[{ name: d.trend.completed, color: CHART.completed }, { name: d.trend.failed, color: CHART.failed }]} />
        </div>
        <ColumnChart
          showMax
          ariaLabel={d.trend.title}
          columns={trend.map((x, i) => ({
            key: x.day,
            label: formatDay(x.day, locale),
            marker: i === trend.length - 1,
            segments: [
              { name: d.trend.completed, value: x.completed, color: CHART.completed, display: formatNumber(x.completed, locale) },
              { name: d.trend.failed, value: x.failed, color: CHART.failed, display: formatNumber(x.failed, locale) },
            ],
          }))}
        />
        <div aria-hidden className="mt-3 flex justify-between text-[11px] text-ink-600">
          <span>{dayLabel(trend[0]!.day)}</span><span>{d.dashboard.today}</span>
        </div>
        <DataTableToggle label={d.dashboard.showTable}>
          <table className="w-full text-sm">
            <thead><tr className="text-start text-xs text-ink-600"><th className="py-1 text-start">{d.common.date}</th><th className="text-end">{d.trend.completed}</th><th className="text-end">{d.trend.failed}</th></tr></thead>
            <tbody>{trend.map((x) => <tr key={x.day} className="border-t border-ink-100"><td className="py-1">{formatDay(x.day, locale)}</td><td className="num text-end">{x.completed}</td><td className="num text-end">{x.failed}</td></tr>)}</tbody>
          </table>
        </DataTableToggle>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={d.dashboard.tonnage} description={d.dashboard.period} />
          <CardBody>
            {k.tonnage.length ? <RankedBars items={k.tonnage.map((x) => ({ label: x.name, value: x.netKgMinor, display: `${formatNumber(x.netKgMinor / 100 / 1000, locale, 2)} t` }))} /> : <p className="text-sm text-ink-600">{d.common.noData}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={d.dashboard.failedByReason} description={d.dashboard.period} />
          <CardBody>
            {k.failedByReason.length ? <RankedBars items={k.failedByReason.map((x) => ({ label: d.enums.FailureReason[x.reason as keyof typeof d.enums.FailureReason], value: x.count, display: formatNumber(x.count, locale) }))} /> : <p className="text-sm text-ink-600">{d.common.noData}</p>}
          </CardBody>
        </Card>
      </div>

      {aging ? (
        <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white px-5 py-4">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-base font-bold text-ink-900">{d.aging.title}</h2>
              <span className="text-sm text-ink-700">{d.dashboard.outstanding}: <strong className="text-ink-950">{money(k.receivables.outstandingMinor)}</strong></span>
            </div>
            <ColumnChart
              ariaLabel={d.aging.title}
              height={140}
              columns={agingKeys.map((b) => ({
                key: b,
                label: `${d.aging[b]} — ${d.aging.invoices.replace("{n}", formatNumber(aging[b].count, locale))}`,
                capLabel: aging[b].minor ? formatMinor(aging[b].minor, locale, ctx.org.currency).replace(/\s?(DZD|DA|د\.ج\.?‏?)\s?/u, "") : undefined,
                segments: [{ name: d.aging[b], value: aging[b].minor, color: agingColor(b), display: formatMinor(aging[b].minor, locale, ctx.org.currency) }],
              }))}
            />
            <div aria-hidden className="mt-2 flex text-center text-[11px] text-ink-600">{agingKeys.map((b) => <span key={b} className="flex-1 px-1">{d.aging[b]}</span>)}</div>
            <DataTableToggle label={d.dashboard.showTable}>
              <table className="w-full text-sm">
                <tbody>{agingKeys.map((b) => <tr key={b} className="border-t border-ink-100"><td className="py-1">{d.aging[b]}</td><td className="num text-end">{aging[b].count}</td><td className="text-end">{money(aging[b].minor)}</td></tr>)}</tbody>
              </table>
            </DataTableToggle>
          </div>
          <dl className="divide-y divide-ink-200 rounded-[var(--radius-card)] border border-ink-200 bg-white">
            {([[d.dashboard.invoiced, k.revenue.invoicedMinor], [d.dashboard.collected, k.revenue.collectedMinor]] as const).map(([label, minor]) => (
              <div key={label} className="px-5 py-4">
                <dt className="text-sm text-ink-600">{label} <span className="text-xs">({d.dashboard.period})</span></dt>
                <dd className="display mt-1 text-2xl leading-tight font-bold break-words text-ink-950 tabular-nums"><bdi>{money(minor)}</bdi></dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {iot.devices > 0 ? (
        <Card className="mt-6">
          <CardHeader title={d.iot.forecastTitle} description={d.iot.forecastLead} action={<Link className="text-sm font-medium text-ink-800 hover:underline" href={`/${locale}/app/iot`}>{d.nav.iot}</Link>} />
          <CardBody className="grid gap-4 md:grid-cols-2">
            {iot.forecasts.slice(0, 6).map((f) => (
              <div key={f.id}>
                <Meter value={f.lastFillPct ?? 0} max={100} label={<><span className="num font-medium">{f.code}</span> <span className="text-ink-600">{f.serviceLocation?.customer.name}</span></>} display={`\u2068${f.lastFillPct ?? "—"} %\u2069`} />
                <p className="mt-1 text-xs text-ink-600">{(f.lastFillPct ?? 0) >= f.fillThresholdPct ? d.iot.atThreshold : f.forecast?.thresholdAt ? d.iot.reachesAt.replace("{pct}", String(f.fillThresholdPct)).replace("{date}", formatDateTime(f.forecast.thresholdAt, locale, ctx.org.timezone)).replace("{rate}", String(f.forecast.ratePctPerDay)) : d.iot.noForecast}</p>
              </div>
            ))}
            {(iot.openAlerts.FIRE_RISK ?? 0) > 0 ? <p role="alert" className="rounded-md bg-danger-100 px-3 py-2 text-sm font-semibold text-danger-700 md:col-span-2">{d.iot.alertKinds.FIRE_RISK}: {iot.openAlerts.FIRE_RISK}</p> : null}
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={d.dashboard.vehicleUse} description={d.dashboard.period} />
          <CardBody className="space-y-4">
            {k.vehicles.length ? k.vehicles.map((v) => (
              <Meter key={v.plate} value={v.activeDays} max={k.period.days} label={<><span className="num font-medium">{v.plate}</span> <span className="text-ink-600">{v.label}</span></>}
                display={`\u2068${formatNumber(v.jobs, locale)} ${d.dashboard.jobs}\u2069 · \u2068${formatPercent(v.utilization, locale)}\u2069`} />
            )) : <p className="text-sm text-ink-600">{d.common.noData}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={d.dashboard.renewals} />
          {renewals.length ? (
            <ul className="divide-y divide-ink-100 text-sm">
              {renewals.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <Link href={`/${locale}/app/contracts/${c.id}`} className="font-medium text-ink-900 hover:underline">{c.customer.name}, <span className="num">{c.reference}</span></Link>
                  <span className="text-ink-600">{formatDay(c.endDate, locale)}</span>
                </li>
              ))}
            </ul>
          ) : <EmptyState title={d.common.noData} />}
        </Card>
      </div>
    </>
  );
}
