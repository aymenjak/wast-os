import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { homeFor } from "@/server/navigation";
import { businessDashboard, dailyTrend, orgToday } from "@/server/services/reports";
import { contractsDueForRenewal } from "@/server/services/contracts";
import { prisma } from "@/server/db";
import { formatDay, formatMinor, formatNumber, formatPercent } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, Stat, EmptyState, MetricStrip } from "@/components/ui/misc";
import { TrendChart } from "@/components/trend-chart";
import { BarList } from "@/components/bar-list";

export default async function Dashboard({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  const home = homeFor(ctx, locale);
  if (home) redirect(home);
  if (!ctx.permissions.has("reports.read")) redirect(`/${locale}/app/work-orders`);

  const to = orgToday(ctx);
  const from = new Date(new Date(`${to}T00:00:00Z`).getTime() - 29 * 86400_000).toISOString().slice(0, 10);
  const [k, renewals, counts, trend] = await Promise.all([
    businessDashboard(ctx, { from, to }),
    contractsDueForRenewal(ctx),
    Promise.all([
      prisma.customer.count({ where: { organizationId: ctx.org.id } }),
      prisma.contract.count({ where: { organizationId: ctx.org.id } }),
      prisma.team.count({ where: { organizationId: ctx.org.id } }),
      prisma.collectionRequest.count({ where: { organizationId: ctx.org.id } }),
    ]),
    dailyTrend(ctx, 14),
  ]);
  const [nCustomers, nContracts, nTeams, nRequests] = counts;
  const onboarding = [
    [nCustomers > 0, d.dashboard.stepCustomer, "/app/customers/new"],
    [nContracts > 0, d.dashboard.stepContract, "/app/contracts/new"],
    [nTeams > 0, d.dashboard.stepTeam, "/app/fleet"],
    [nRequests > 0, d.dashboard.stepRequest, "/app/requests/new"],
  ] as const;
  const showOnboarding = onboarding.some(([done]) => !done);
  const t = k.workOrders.today;

  return (
    <>
      <PageHeader title={d.dashboard.title} description={`${ctx.org.name}, ${formatDay(to, locale)}`} />

      {showOnboarding ? (
        <Card className="mb-6">
          <CardHeader title={d.dashboard.gettingStarted} />
          <CardBody>
            <ol className="grid gap-2 sm:grid-cols-2">
              {onboarding.map(([done, label, href]) => (
                <li key={href}>
                  <Link href={`/${locale}${href}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-ink-50">
                    {done ? <CheckCircle2 aria-hidden className="size-4 text-success-700" /> : <Circle aria-hidden className="size-4 text-ink-500" />}
                    <span className={done ? "text-ink-500 line-through" : "text-ink-800"}>{label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      ) : null}

      <h2 className="mb-2 text-base font-bold text-ink-800">{d.dashboard.today}</h2>
      <MetricStrip>
        <Stat label={d.dashboard.plannedToday} value={formatNumber((t.PLANNED ?? 0) + (t.ASSIGNED ?? 0), locale)} />
        <Stat label={d.dashboard.inProgress} value={formatNumber(t.IN_PROGRESS ?? 0, locale)} />
        <Stat label={d.dashboard.completedToday} value={formatNumber(t.COMPLETED ?? 0, locale)} />
        <Stat label={d.dashboard.overdue} value={formatNumber(k.workOrders.overdue, locale)} tone={k.workOrders.overdue > 0 ? "danger" : "default"} />
      </MetricStrip>

      <section className="mt-6 rounded-[var(--radius-card)] border border-ink-200 bg-white px-5 py-4">
        <h2 className="mb-3 text-base font-bold text-ink-900">{d.trend.title}</h2>
        <TrendChart data={trend} d={d} locale={locale} />
      </section>

      <h2 className="mb-2 mt-8 text-base font-bold text-ink-800">{d.dashboard.period}</h2>
      <MetricStrip>
        <Stat label={d.dashboard.completionRate} value={k.workOrders.completionRate == null ? "—" : formatPercent(k.workOrders.completionRate, locale)} sub={`${formatNumber(k.workOrders.failed, locale)} ${d.dashboard.failedAttempts.toLowerCase()}`} />
        <Stat label={d.dashboard.pendingRequests} value={formatNumber(k.pendingRequests, locale)} tone={k.pendingRequests > 0 ? "warning" : "default"} />
        <Stat label={d.dashboard.invoiced} value={<span className="num">{formatMinor(k.revenue.invoicedMinor, locale, ctx.org.currency)}</span>} sub={<>{d.dashboard.collected}: <span className="num">{formatMinor(k.revenue.collectedMinor, locale, ctx.org.currency)}</span></>} />
        <Stat label={d.dashboard.outstanding} value={<span className="num">{formatMinor(k.receivables.outstandingMinor, locale, ctx.org.currency)}</span>} sub={`${formatNumber(k.receivables.overdueCount, locale)} ${d.dashboard.overdueInvoices}`} tone={k.receivables.overdueCount > 0 ? "warning" : "default"} />
      </MetricStrip>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={d.dashboard.tonnage} />
          <CardBody>
            {k.tonnage.length ? (
              <BarList items={k.tonnage.map((x) => ({ label: x.name, value: x.netKgMinor / 100 / 1000, display: `${formatNumber(x.netKgMinor / 100 / 1000, locale, 2)} t` }))} />
            ) : <p className="text-sm text-ink-500">{d.common.noData}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={d.dashboard.failedByReason} />
          <CardBody>
            {k.failedByReason.length ? (
              <BarList tone="warning" items={k.failedByReason.map((x) => ({ label: d.enums.FailureReason[x.reason as keyof typeof d.enums.FailureReason], value: x.count, display: formatNumber(x.count, locale) }))} />
            ) : <p className="text-sm text-ink-500">{d.common.noData}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={d.dashboard.vehicleUse} />
          <CardBody>
            {k.vehicles.length ? (
              <ul className="divide-y divide-ink-100 text-sm">
                {k.vehicles.map((v) => (
                  <li key={v.plate} className="flex items-center justify-between gap-3 py-2">
                    <span><span className="num font-medium text-ink-900">{v.plate}</span> <span className="text-ink-600">{v.label}</span></span>
                    <span className="text-ink-600">{formatNumber(v.jobs, locale)} {d.dashboard.jobs}, {formatNumber(v.activeDays, locale)} {d.dashboard.activeDays}, <span className="num">{formatPercent(v.utilization, locale)}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-500">{d.common.noData}</p>}
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
