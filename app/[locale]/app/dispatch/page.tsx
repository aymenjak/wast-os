import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { dispatchBoard } from "@/server/services/work-orders";
import { orgToday } from "@/server/services/reports";
import { straightLineRouting } from "@/server/routing";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader } from "@/components/ui/misc";
import { AssignForm } from "./assign-form";

function shift(day: string, n: number) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + n * 86400_000).toISOString().slice(0, 10);
}

export default async function DispatchPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ date?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("workorders.dispatch")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : orgToday(ctx);
  const { orders, teams, vehicles, backlog } = await dispatchBoard(ctx, date);
  const open = orders.filter((o) => !["CANCELLED"].includes(o.status));
  const unassigned = open.filter((o) => !o.teamId);
  const teamOpts = teams.map((t) => ({ id: t.id, name: t.name }));
  const vehicleOpts = vehicles.map((v) => ({ id: v.id, name: `${v.plateNumber} · ${v.label}` }));
  const stop = (o: (typeof orders)[number]) => {
    const lat = o.serviceLocation?.latitude ?? o.civicReport?.latitude;
    const lng = o.serviceLocation?.longitude ?? o.civicReport?.longitude;
    return lat != null && lng != null ? { id: o.id, lat: Number(lat), lng: Number(lng) } : { id: o.id, lat: null, lng: null };
  };
  const columns = await Promise.all(
    teams.map(async (t) => {
      const list = open.filter((o) => o.teamId === t.id);
      const route = await straightLineRouting.plan(null, list.map(stop));
      const ordered = [...route.order, ...route.unlocated].map((id) => list.find((o) => o.id === id)!);
      return { team: t, list: ordered, km: route.distanceKm };
    }),
  );

  const label = (o: (typeof orders)[number]) => o.customer?.name ?? (o.civicReport ? `${d.workOrders.civicReport} ${o.civicReport.trackingCode}` : "—");
  const where = (o: (typeof orders)[number]) => o.serviceLocation?.label ?? o.civicReport?.addressHint ?? "";

  return (
    <>
      <PageHeader
        title={d.dispatch.title}
        actions={
          <nav aria-label={d.dispatch.date} className="flex items-center gap-1">
            <Link href={`?date=${shift(date, -1)}`} className="rounded-md p-2 text-ink-700 hover:bg-ink-100"><ChevronLeft aria-hidden className="size-4 rtl:rotate-180" /><span className="sr-only">−1</span></Link>
            <form className="flex items-center gap-2">
              <label htmlFor="date" className="sr-only">{d.dispatch.date}</label>
              <input id="date" type="date" name="date" defaultValue={date} className="h-9 rounded-md border border-ink-300 px-2 text-sm" />
              <button className="h-9 rounded-md bg-white px-3 text-sm ring-1 ring-ink-200 hover:bg-ink-50">{d.common.apply}</button>
            </form>
            <Link href={`?date=${shift(date, 1)}`} className="rounded-md p-2 text-ink-700 hover:bg-ink-100"><ChevronRight aria-hidden className="size-4 rtl:rotate-180" /><span className="sr-only">+1</span></Link>
          </nav>
        }
        description={formatDay(date, locale)}
      />
      {teams.length === 0 ? <Card><EmptyState title={d.dispatch.noTeams} /></Card> : null}

      {backlog.length ? (
        <Card className="mb-6 border-warning-100">
          <CardHeader title={`${d.dispatch.backlog} (${formatNumber(backlog.length, locale)})`} />
          <ul className="divide-y divide-ink-100 text-sm">
            {backlog.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2">
                <Link className="num font-medium hover:underline" href={`/${locale}/app/work-orders/${o.id}`}>{o.number}</Link>
                <span className="text-ink-700">{o.customer?.name ?? o.civicReport?.trackingCode}</span>
                <span className="text-xs text-danger-700">{formatDay(o.scheduledDate, locale)}</span>
                <AssignForm workOrderId={o.id} teams={teamOpts} vehicles={vehicleOpts} date={date} compact />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title={`${d.dispatch.unassignedColumn} (${formatNumber(unassigned.length, locale)})`} />
          {unassigned.length === 0 ? <EmptyState title={d.dispatch.emptyDay} /> : (
            <ul className="divide-y divide-ink-100">
              {unassigned.map((o) => (
                <li key={o.id} className="space-y-2 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link className="num font-medium text-ink-900 hover:underline" href={`/${locale}/app/work-orders/${o.id}`}>{o.number}</Link>
                    <StatusBadge status={o.priority} label={d.enums.Priority[o.priority]} />
                  </div>
                  <div className="text-ink-800">{label(o)}</div>
                  <div className="text-xs text-ink-500">{where(o)}</div>
                  {teams.length ? <AssignForm workOrderId={o.id} teams={teamOpts} vehicles={vehicleOpts} date={date} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        {columns.map(({ team, list, km }) => (
          <Card key={team.id}>
            <CardHeader title={team.name} description={`${formatNumber(list.length, locale)} ${d.dispatch.stops}${list.length > 1 ? ` · ≈ ${formatNumber(km, locale, 1)} ${d.dispatch.km}` : ""}`} />
            {list.length === 0 ? <EmptyState title={d.dispatch.emptyDay} /> : (
              <>
                <ol className="divide-y divide-ink-100">
                  {list.map((o, i) => (
                    <li key={o.id} className="flex gap-3 px-4 py-3 text-sm">
                      <span className="num mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <Link className="num font-medium text-ink-900 hover:underline" href={`/${locale}/app/work-orders/${o.id}`}>{o.number}</Link>
                          <StatusBadge status={o.status} label={d.enums.WorkOrderStatus[o.status]} />
                        </div>
                        <div className="truncate text-ink-800">{label(o)}</div>
                        <div className="flex items-center gap-1 text-xs text-ink-500"><MapPin aria-hidden className="size-3" />{where(o)}{o.vehicle ? <> · <span className="num">{o.vehicle.plateNumber}</span></> : null}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                {list.length > 1 ? <p className="border-t border-ink-100 px-4 py-2 text-xs text-ink-500">{d.dispatch.suggestedOrder}: {d.dispatch.straightLineNote}</p> : null}
              </>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
