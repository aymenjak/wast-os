import Link from "next/link";
import { formatDateTime } from "@/lib/i18n/format";
import { orgToday } from "@/server/services/reports";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { getVehicle } from "@/server/services/fleet";
import { vehicleConsumption } from "@/server/services/stock";
import { formatDay, formatMinor, formatMoney, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { setVehicleStatusAction } from "@/app/actions/business";
import { MaintenanceForm, VehicleDocumentForm } from "../forms";

export default async function VehicleDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const v = await orNotFound(getVehicle(ctx, id));
  const canWrite = ctx.permissions.has("fleet.write");
  const today = orgToday(ctx);
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - 89 * 86_400_000).toISOString().slice(0, 10);
  const used = await vehicleConsumption(ctx, v.id, since, today);
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/fleet`} className="hover:underline">{d.fleet.title}</Link>}
        title={<span className="num">{v.plateNumber}</span>}
        description={`${v.label}, ${d.enums.VehicleType[v.type]}`}
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
                [d.iot.lastPosition, v.lastPositionAt && v.lastLatitude && v.lastLongitude ? (
                  <span key="gps"><a className="num hover:underline" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${v.lastLatitude}&mlon=${v.lastLongitude}#map=16/${v.lastLatitude}/${v.lastLongitude}`}>{v.lastLatitude.toString()}, {v.lastLongitude.toString()}</a>
                    <span className="block text-xs text-ink-600">{formatDateTime(v.lastPositionAt, locale, ctx.org.timezone)}{v.lastSpeedKmh != null ? ` · ${v.lastSpeedKmh} km/h` : ""}</span></span>
                ) : null],
              ]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={d.fleet.documents} description={d.fleet.documentsLead} />
            {v.documents.length === 0 ? <CardBody><p className="text-sm text-ink-600">{d.fleet.noDocuments}</p></CardBody> : (
              <Table>
                <thead><tr><Th>{d.fleet.documentKind}</Th><Th>{d.fleet.reference}</Th><Th>{d.fleet.issuer}</Th><Th>{d.fleet.expiresOn}</Th><Th>{d.common.status}</Th></tr></thead>
                <tbody>{v.documents.map((doc, i) => {
                  const current = v.documents.findIndex((x) => x.kind === doc.kind) === i;
                  const expired = !!doc.expiresOn && doc.expiresOn.toISOString().slice(0, 10) < today;
                  return (
                    <tr key={doc.id} className={current ? "" : "opacity-60"}>
                      <Td>{d.enums.VehicleDocumentKind[doc.kind]}</Td>
                      <Td>{doc.reference ? <bdi className="num">{doc.reference}</bdi> : "—"}</Td>
                      <Td>{doc.issuer ?? "—"}</Td>
                      <Td><bdi>{formatDay(doc.expiresOn, locale)}</bdi></Td>
                      <Td>{!current ? d.fleet.superseded : expired ? <span className="font-medium text-danger-700">{d.fleet.expired.replace("{n}", String(Math.round((Date.parse(`${today}T00:00:00Z`) - doc.expiresOn!.getTime()) / 86_400_000)))}</span> : d.fleet.inForce}</Td>
                    </tr>
                  );
                })}</tbody>
              </Table>
            )}
            {canWrite ? <CardBody className="border-t border-ink-100"><VehicleDocumentForm vehicleId={v.id} /></CardBody> : null}
          </Card>
          <Card>
            <CardHeader title={d.stock.vehicleConsumption} description={used.rows.length ? formatMinor(used.totalMinor, locale) : undefined}
              action={<Link className="text-sm font-medium text-brand-800 hover:underline" href={`/${locale}/app/stock`}>{d.stock.openStock}</Link>} />
            {used.rows.length === 0 ? <CardBody><p className="text-sm text-ink-600">{d.stock.vehicleNone}</p></CardBody> : (
              <Table>
                <thead><tr><Th>{d.common.date}</Th><Th>{d.stock.item}</Th><Th numeric>{d.stock.quantity}</Th><Th numeric>{d.stock.value}</Th></tr></thead>
                <tbody>{used.rows.map((m) => (
                  <tr key={m.id}>
                    <Td><bdi>{formatDay(m.occurredOn, locale)}</bdi></Td>
                    <Td><Link className="hover:underline" href={`/${locale}/app/stock/${m.item.id}`}>{m.item.name}</Link>{m.reason ? <div className="text-xs text-ink-600">{m.reason}</div> : null}</Td>
                    <Td numeric><span className="num">{formatNumber(-Number(m.quantity), locale, 3)}</span> {d.enums.StockUnit[m.item.unit]}</Td>
                    <Td numeric>{formatMinor(-Number(m.valueMinor), locale)}</Td>
                  </tr>
                ))}</tbody>
              </Table>
            )}
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
                <div className="text-xs text-ink-500">{formatDay(w.scheduledDate, locale)}, {w.customer?.name ?? "—"}, {w.team?.name ?? "—"}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
