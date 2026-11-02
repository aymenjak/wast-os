import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { daysOnSite, getContainer } from "@/server/services/containers";
import { prisma } from "@/server/db";
import { formatDateTime, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, PageHeader } from "@/components/ui/misc";
import { MoveForm } from "../forms";
import { containerTelemetry } from "@/server/services/iot";
import { Meter } from "@/components/charts/charts";
import { ColumnChart } from "@/components/charts/column-chart";
import { CHART } from "@/components/charts/palette";

export default async function ContainerDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const c = await orNotFound(getContainer(ctx, id));
  const canWrite = ctx.permissions.has("fleet.write");
  const locations = canWrite && c.status === "IN_YARD"
    ? await prisma.serviceLocation.findMany({ where: { organizationId: ctx.org.id, active: true }, select: { id: true, label: true, customer: { select: { name: true } } }, orderBy: { customer: { name: "asc" } } })
    : [];
  const days = daysOnSite(c.placedAt);
  const tel = await containerTelemetry(ctx, c.id);
  // Daily maximum fill for the chart (one column per day with data).
  const daily = new Map<string, number>();
  for (const r of tel.readings) if (r.fillPct !== null) {
    const k = new Intl.DateTimeFormat("en-CA", { timeZone: ctx.org.timezone, month: "2-digit", day: "2-digit" }).format(r.measuredAt);
    daily.set(k, Math.max(daily.get(k) ?? 0, r.fillPct));
  }
  const last = [...tel.readings].reverse().find((r) => r.fillPct !== null);
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/containers`} className="hover:underline">{d.containers.title}</Link>}
        title={<span className="num">{c.code}</span>}
        description={d.enums.ContainerType[c.type]}
        actions={<StatusBadge status={c.status === "AT_CUSTOMER" ? "IN_PROGRESS" : c.status === "IN_YARD" ? "AVAILABLE" : c.status} label={d.enums.ContainerStatus[c.status]} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={d.common.details} />
            <CardBody className="space-y-4">
              <DescriptionList items={[
                [d.containers.location, c.serviceLocation ? <Link key="l" className="hover:underline" href={`/${locale}/app/customers/${c.serviceLocation.customer.id}`}>{c.serviceLocation.customer.name}, {c.serviceLocation.label}</Link> : d.enums.ContainerStatus[c.status]],
                [d.containers.since, days != null ? d.containers.daysOnSite.replace("{days}", formatNumber(days, locale)) : null],
                [d.common.notes, c.notes],
              ]} />
              {canWrite ? (
                <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                  {c.status === "IN_YARD" ? <MoveForm containerId={c.id} action="deliver" label={d.containers.deliver} variant="primary" locations={locations.map((l) => ({ id: l.id, label: `${l.customer.name}, ${l.label}` }))} /> : null}
                  {c.status === "AT_CUSTOMER" ? <MoveForm containerId={c.id} action="remove" label={d.containers.remove} variant="primary" /> : null}
                  {c.status === "IN_YARD" || c.status === "AT_CUSTOMER" ? <MoveForm containerId={c.id} action="maintenance" label={d.containers.maintenance} /> : null}
                  {c.status === "MAINTENANCE" ? <MoveForm containerId={c.id} action="backInService" label={d.containers.backInService} /> : null}
                  {c.status === "IN_YARD" || c.status === "MAINTENANCE" ? <MoveForm containerId={c.id} action="retire" label={d.containers.retire} variant="danger" /> : null}
                </div>
              ) : null}
            </CardBody>
          </Card>
          {tel.readings.length ? (
            <Card>
              <CardHeader title={d.iot.readings} description={d.iot.threshold.replace("{pct}", String(tel.threshold))} />
              <CardBody className="space-y-4">
                {last ? <Meter value={last.fillPct!} max={100} label={d.iot.fill} display={`\u2068${last.fillPct} %\u2069`} /> : null}
                <p className="text-sm text-ink-700">{last && last.fillPct! >= tel.threshold ? d.iot.atThreshold : tel.forecast?.thresholdAt ? d.iot.reachesAt.replace("{pct}", String(tel.threshold)).replace("{date}", formatDateTime(tel.forecast.thresholdAt, locale, ctx.org.timezone)).replace("{rate}", String(tel.forecast.ratePctPerDay)) : d.iot.noForecast}</p>
                <ColumnChart ariaLabel={d.iot.readings} height={120} showMax columns={[...daily.entries()].map(([k, v]) => ({ key: k, label: k, segments: [{ name: d.iot.fill, value: v, color: v >= tel.threshold ? CHART.failed : CHART.single, display: `${v} %` }] }))} />
              </CardBody>
            </Card>
          ) : null}
        </div>
        <Card>
          <CardHeader title={d.containers.history} />
          <ol className="relative space-y-4 px-5 py-4 text-sm before:absolute before:inset-y-5 before:start-[1.6rem] before:w-px before:bg-ink-200">
            {c.movements.map((m) => (
              <li key={m.id} className="relative ps-6">
                <span aria-hidden className="absolute start-[0.2rem] top-1.5 size-2.5 rounded-full border-2 border-white bg-ink-500" />
                <div className="font-medium text-ink-900">{d.enums.ContainerMoveKind[m.kind]}{m.serviceLocation ? `, ${m.serviceLocation.label}` : ""}</div>
                <div className="text-xs text-ink-600">{formatDateTime(m.occurredAt, locale, ctx.org.timezone)}{m.workOrder ? <> — <Link className="num hover:underline" href={`/${locale}/app/work-orders/${m.workOrder.id}`}>{m.workOrder.number}</Link></> : null}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
