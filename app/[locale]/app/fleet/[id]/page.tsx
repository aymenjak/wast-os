import Link from "next/link";
import { orgToday } from "@/server/services/reports";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { getVehicle } from "@/server/services/fleet";
import { formatDay, formatMoney, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { setVehicleStatusAction } from "@/app/actions/business";
import { MaintenanceForm } from "../forms";

export default async function VehicleDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const v = await orNotFound(getVehicle(ctx, id));
  const canWrite = ctx.permissions.has("fleet.write");
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/fleet`} className="hover:underline">{d.fleet.title}</Link>}
        title={<span className="num">{v.plateNumber}</span>}
        description={`${v.label} · ${d.enums.VehicleType[v.type]}`}
        actions={
          <>
            <StatusBadge status={v.status} label={d.enums.VehicleStatus[v.status]} />
            {canWrite ? (["AVAILABLE", "MAINTENANCE", "RETIRED"] as const).filter((s) => s !== v.status).map((s) => (
              <InlineAction key={s} action={setVehicleStatusAction} hidden={{ vehicleId: v.id, status: s }} label={d.enums.VehicleStatus[s]} variant={s === "RETIRED" ? "danger" : "secondary"} />
            )) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={d.common.details} />
            <CardBody>
              <DescriptionList items={[
                [d.fleet.capacity, v.capacityKg ? formatNumber(v.capacityKg, locale) : null],
                [d.fleet.odometer, v.odometerKm != null ? formatNumber(v.odometerKm, locale) : null],
                [d.fleet.restrictions, v.restrictions],
              ]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={d.fleet.maintenance} />
            {v.maintenance.length ? (
              <Table>
                <thead><tr><Th>{d.fleet.performedAt}</Th><Th>{d.fleet.type}</Th><Th>{d.fleet.description}</Th><Th numeric>{d.fleet.cost}</Th><Th>{d.fleet.nextDue}</Th></tr></thead>
                <tbody>
                  {v.maintenance.map((m) => (
                    <tr key={m.id}><Td>{formatDay(m.performedAt, locale)}</Td><Td>{d.enums.MaintenanceKind[m.kind]}</Td><Td>{m.description}</Td><Td numeric>{m.cost ? <span className="num">{formatMoney(m.cost, locale)}</span> : "—"}</Td><Td>{formatDay(m.nextDueAt, locale)}</Td></tr>
                  ))}
                </tbody>
              </Table>
            ) : <EmptyState title={d.common.noData} />}
            {canWrite ? <CardBody className="border-t border-ink-100"><MaintenanceForm vehicleId={v.id} today={orgToday(ctx)} /></CardBody> : null}
          </Card>
        </div>
        <Card>
          <CardHeader title={d.fleet.assignments} />
          <ul className="divide-y divide-ink-100 text-sm">
            {v.workOrders.map((w) => (
              <li key={w.id} className="px-5 py-2">
                <div className="flex items-center justify-between"><Link href={`/${locale}/app/work-orders/${w.id}`} className="num font-medium hover:underline">{w.number}</Link><StatusBadge status={w.status} label={d.enums.WorkOrderStatus[w.status]} /></div>
                <div className="text-xs text-ink-500">{formatDay(w.scheduledDate, locale)} · {w.customer?.name ?? "—"} · {w.team?.name ?? "—"}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
