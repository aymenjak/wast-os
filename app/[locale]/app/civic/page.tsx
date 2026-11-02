import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { civicAnalytics } from "@/server/services/civic";
import { formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Forbidden, PageHeader, Stat, MetricStrip, Table, Td, Th } from "@/components/ui/misc";
import { RankedBars } from "@/components/charts/charts";
import { buttonClass } from "@/components/ui/button";

export default async function CivicOverview({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("civic.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const a = await civicAnalytics(ctx);
  const s = a.byStatus;
  const open = (s.SUBMITTED ?? 0) + (s.UNDER_REVIEW ?? 0) + (s.VERIFIED ?? 0) + (s.ASSIGNED ?? 0) + (s.IN_PROGRESS ?? 0) + (s.REOPENED ?? 0) + (s.DISPUTED ?? 0);
  return (
    <>
      <PageHeader title={d.civic.overviewTitle} description={ctx.org.name} actions={<>
        <Link href={`/${locale}/app/civic/queue`} className={buttonClass("primary", "sm")}>{d.civic.queueTitle}</Link>
        <Link href={`/${locale}/civic/map/${ctx.org.slug}`} className={buttonClass("secondary", "sm")}>{d.civic.publicMapTitle}</Link>
      </>} />
      <MetricStrip>
        <Stat label={d.civic.open} value={formatNumber(open, locale)} />
        <Stat label={d.enums.CivicReportStatus.SUBMITTED} value={formatNumber(s.SUBMITTED ?? 0, locale)} tone={(s.SUBMITTED ?? 0) > 0 ? "warning" : "default"} />
        <Stat label={d.civic.overdueSla} value={formatNumber(a.overdue, locale)} tone={a.overdue > 0 ? "danger" : "default"} />
        <Stat label={d.civic.medianResolution} value={a.medianResolutionHours == null ? "—" : `${formatNumber(a.medianResolutionHours, locale, 1)} ${d.civic.hours}`} sub={`${formatNumber(a.resolvedCount, locale)} ${d.civic.resolved.toLowerCase()}`} />
      </MetricStrip>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={d.civic.byCategory} />
          <CardBody>{a.byCategory.length ? <RankedBars items={a.byCategory.map((c) => ({ label: d.enums.CivicCategory[c.category], value: c.count, display: formatNumber(c.count, locale) }))} /> : <p className="text-sm text-ink-500">{d.civic.noReports}</p>}</CardBody>
        </Card>
        <Card>
          <CardHeader title={d.civic.teamPerformance} />
          {a.teamPerformance.length ? (
            <Table>
              <thead><tr><Th>{d.workOrders.team}</Th><Th numeric>{d.civic.completed}</Th><Th numeric>{d.civic.avgDuration}</Th></tr></thead>
              <tbody>{a.teamPerformance.map((t) => <tr key={t.team}><Td>{t.team}</Td><Td numeric>{formatNumber(t.completed, locale)}</Td><Td numeric>{t.avgHours == null ? "—" : `${formatNumber(t.avgHours, locale, 1)} ${d.civic.hours}`}</Td></tr>)}</tbody>
            </Table>
          ) : <CardBody><p className="text-sm text-ink-500">{d.common.noData}</p></CardBody>}
        </Card>
      </div>
    </>
  );
}
