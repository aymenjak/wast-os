import Link from "next/link";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { orgToday } from "@/server/services/reports";
import { dispatchView, stopOf, type BoardOrder } from "@/server/dispatch-view";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { AssignForm } from "./assign-form";
import { GenerateSchedule } from "./generate-schedule";
import { OpsMap } from "./ops-map";
import { vehiclePositions } from "@/server/services/iot";

function shift(day: string, n: number) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
}

export default async function DispatchPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ date?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("workorders.dispatch")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const today = orgToday(ctx);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const v = await dispatchView(ctx, date);
  const teamOpts = v.teams.map((t) => ({ id: t.id, name: t.name }));
  const vehicleOpts = v.vehicles.map((x) => ({ id: x.id, name: `${x.plateNumber}, ${x.label}` }));
  const label = (o: BoardOrder) => o.customer?.name ?? (o.civicReport ? `${d.workOrders.civicReport} ${o.civicReport.trackingCode}` : "—");
  const where = (o: BoardOrder) => o.serviceLocation?.label ?? o.civicReport?.addressHint ?? "";

  const mapPoints = [
    ...v.teamRoutes.flatMap((r) => r.orders.map((o, i) => ({ o, color: r.color, order: i + 1 }))),
    ...v.unassigned.map((o) => ({ o, color: "#566468", order: undefined })),
  ].flatMap(({ o, color, order }) => {
    const s = stopOf(o);
    return s.lat == null ? [] : [{ id: o.id, lat: s.lat, lng: s.lng!, color, order, label: `${o.number}, ${label(o)}`, href: `/${locale}/app/work-orders/${o.id}` }];
  });
  const mapRoutes = v.teamRoutes.map((r) => ({ id: r.team.id, color: r.color, points: r.orders.map(stopOf).filter((s) => s.lat != null).map((s) => [s.lat!, s.lng!] as [number, number]) }));

  const liveVehicles = ctx.permissions.has("fleet.read") ? await vehiclePositions(ctx) : [];
  return (
    <>
      <PageHeader
        title={d.dispatch.title}
        description={formatDay(date, locale)}
        actions={
          <>
            <nav aria-label={d.dispatch.date} className="flex items-center gap-1">
              <Link href={`?date=${shift(date, -1)}`} className="rounded-md p-2 text-ink-700 hover:bg-ink-100"><ChevronLeft aria-hidden className="size-4 rtl:rotate-180" /><span className="sr-only">{formatDay(shift(date, -1), locale)}</span></Link>
              <form className="flex items-center gap-2">
                <label htmlFor="date" className="sr-only">{d.dispatch.date}</label>
                <input id="date" type="date" name="date" defaultValue={date} className="h-9 rounded-md border border-ink-300 bg-white px-2 text-sm" />
                <button className={buttonClass("secondary", "sm", "h-9")}>{d.common.apply}</button>
              </form>
              <Link href={`?date=${shift(date, 1)}`} className="rounded-md p-2 text-ink-700 hover:bg-ink-100"><ChevronRight aria-hidden className="size-4 rtl:rotate-180" /><span className="sr-only">{formatDay(shift(date, 1), locale)}</span></Link>
            </nav>
            <GenerateSchedule from={today} to={shift(today, 6)} />
          </>
        }
      />

      <section aria-labelledby="ops-map" className="mb-6 overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-ink-100 px-5 py-3">
          <h2 id="ops-map" className="text-[1.05rem] font-bold text-ink-900">{d.schedule.opsMap}</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-700">
            {v.teamRoutes.map((r) => (
              <li key={r.team.id} className="flex items-center gap-1.5"><span aria-hidden className="h-1 w-5 rounded-full" style={{ background: r.color }} />{r.team.name}</li>
            ))}
          </ul>
        </div>
        {mapPoints.length || liveVehicles.length ? <OpsMap points={mapPoints} routes={mapRoutes} initialVehicles={liveVehicles} locale={locale} /> : <EmptyState title={d.schedule.noLocated} />}
      </section>

      {v.teams.length === 0 ? <Card className="mb-6"><EmptyState art="workOrders" title={d.dispatch.noTeams} /></Card> : null}

      {v.backlog.length ? (
        <Card className="mb-6">
          <CardHeader title={`${d.dispatch.backlog} (${formatNumber(v.backlog.length, locale)})`} />
          <ul className="divide-y divide-ink-100 text-sm">
            {v.backlog.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2">
                <Link className="num font-semibold hover:underline" href={`/${locale}/app/work-orders/${o.id}`}>{o.number}</Link>
                <span className="text-ink-700">{o.customer?.name ?? o.civicReport?.trackingCode}</span>
                <span className="text-xs font-medium text-danger-700">{formatDay(o.scheduledDate, locale)}</span>
                <AssignForm workOrderId={o.id} teams={teamOpts} vehicles={vehicleOpts} date={date} compact />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title={`${d.dispatch.unassignedColumn} (${formatNumber(v.unassigned.length, locale)})`} />
          {v.unassigned.length === 0 ? <EmptyState art="done" title={d.dispatch.emptyDay} /> : (
            <ul className="divide-y divide-ink-100">
              {v.unassigned.map((o) => (
                <li key={o.id} className="space-y-2 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link className="num font-semibold text-ink-900 hover:underline" href={`/${locale}/app/work-orders/${o.id}`}>{o.number}</Link>
                    <StatusBadge status={o.priority} label={d.enums.Priority[o.priority]} />
                  </div>
                  <div className="text-ink-800">{label(o)}</div>
                  <div className="text-xs text-ink-600">{where(o)}</div>
                  {v.teams.length ? <AssignForm workOrderId={o.id} teams={teamOpts} vehicles={vehicleOpts} date={date} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {v.teamRoutes.map(({ team, color, orders, km }) => (
          <Card key={team.id}>
            <header className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-3.5">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[1.05rem] font-bold text-ink-900"><span aria-hidden className="h-1 w-5 rounded-full" style={{ background: color }} />{team.name}</h2>
                <p className="mt-0.5 text-sm text-ink-600">{formatNumber(orders.length, locale)} {d.dispatch.stops}{orders.length > 1 ? `, ≈ ${formatNumber(km, locale, 1)} ${d.dispatch.km}` : ""}</p>
              </div>
              {orders.length ? (
                <Link href={`/${locale}/app/dispatch/sheet?date=${date}&team=${team.id}`} className={buttonClass("ghost", "sm")} title={d.schedule.routeSheet}>
                  <Printer aria-hidden className="size-4" /><span className="sr-only">{d.schedule.routeSheet}</span>
                </Link>
              ) : null}
            </header>
            {orders.length === 0 ? <EmptyState title={d.dispatch.emptyDay} /> : (
              <>
                <ol className="relative px-4 py-3">
                  {orders.map((o, i) => (
                    <li key={o.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < orders.length - 1 ? <span aria-hidden className="absolute start-[11px] top-6 bottom-0 w-[3px] rounded-full" style={{ background: color, opacity: 0.35 }} /> : null}
                      <span className="num relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: o.status === "COMPLETED" ? "#1f5a44" : o.status === "FAILED" ? "#b42318" : color }}>{i + 1}</span>
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <Link className="num font-semibold text-ink-900 hover:underline" href={`/${locale}/app/work-orders/${o.id}`}>{o.number}</Link>
                          <StatusBadge status={o.status} label={d.enums.WorkOrderStatus[o.status]} />
                        </div>
                        <div className="truncate text-ink-800">{label(o)}</div>
                        <div className="text-xs text-ink-600">{where(o)}{o.vehicle ? <>, <span className="num">{o.vehicle.plateNumber}</span></> : null}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                {orders.length > 1 ? <p className="border-t border-ink-100 px-4 py-2 text-xs text-ink-600">{d.dispatch.straightLineNote}</p> : null}
              </>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
