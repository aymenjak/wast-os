import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";
import { orgToday } from "@/server/services/reports";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { getWorkOrder } from "@/server/services/work-orders";
import { allowedWorkOrderActions } from "@/server/domain/work-order-machine";
import { prisma } from "@/server/db";
import { formatDateTime, formatDay, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { AssignForm } from "../../dispatch/assign-form";
import { EvidenceUpload, WeightForm, WorkOrderActions } from "./forms";

export default async function WorkOrderDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const wo = await orNotFound(getWorkOrder(ctx, id));
  const canDispatch = ctx.permissions.has("workorders.dispatch");
  const isMember = wo.team?.members.some((m) => m.membershipId === ctx.membershipId) ?? false;
  const canExecute = ctx.permissions.has("workorders.execute") && (canDispatch || isMember);
  const actions = allowedWorkOrderActions(wo.status).filter((a) =>
    ["start", "complete", "fail"].includes(a) ? canExecute : ["unassign", "cancel", "reschedule", "resolveDispute", "redo"].includes(a) ? canDispatch : false,
  );
  const [teams, vehicles] = canDispatch && ["PLANNED", "ASSIGNED"].includes(wo.status)
    ? await Promise.all([
        prisma.team.findMany({ where: { organizationId: ctx.org.id, active: true }, orderBy: { name: "asc" } }),
        prisma.vehicle.findMany({ where: { organizationId: ctx.org.id, status: { in: ["AVAILABLE", "IN_SERVICE"] } }, orderBy: { plateNumber: "asc" } }),
      ])
    : [[], []];
  const lat = wo.serviceLocation?.latitude;
  const lng = wo.serviceLocation?.longitude;
  const name = (x: { nameEn: string; nameFr: string; nameAr: string }) => (locale === "ar" ? x.nameAr : locale === "fr" ? x.nameFr : x.nameEn);
  const netTotal = wo.weightTickets.reduce((s, t) => s + Number(t.netKg), 0);

  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/work-orders`} className="hover:underline">{d.workOrders.title}</Link>}
        title={<span className="num">{wo.number}</span>}
        description={`${d.enums.WorkOrderKind[wo.kind]} · ${formatDay(wo.scheduledDate, locale)}`}
        actions={<><StatusBadge status={wo.priority} label={d.enums.Priority[wo.priority]} /><StatusBadge status={wo.status} label={d.enums.WorkOrderStatus[wo.status]} /></>}
      />

      {actions.length ? (
        <Card className="mb-6"><CardBody><WorkOrderActions workOrderId={wo.id} actions={actions} today={orgToday(ctx)} /></CardBody></Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={d.common.details} />
            <CardBody className="space-y-4">
              {wo.customer ? (
                <div className="flex items-start gap-3">
                  <MapPin aria-hidden className="mt-0.5 size-4 text-ink-500" />
                  <div className="min-w-0 text-sm">
                    <Link href={`/${locale}/app/customers/${wo.customer.id}`} className="font-medium text-ink-900 hover:underline">{wo.customer.name}</Link>
                    <div className="text-ink-700">{wo.serviceLocation?.label} — {wo.serviceLocation?.addressLine}</div>
                    {wo.serviceLocation?.accessNotes ? <div className="mt-1 rounded bg-sand-100 px-2 py-1 text-xs text-ink-800">{wo.serviceLocation.accessNotes}</div> : null}
                    {wo.customer.serviceConditions ? <div className="mt-1 text-xs text-ink-600">{wo.customer.serviceConditions}</div> : null}
                  </div>
                  {lat && lng ? (
                    <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`} target="_blank" rel="noopener noreferrer" className="ms-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-50 px-2.5 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100">
                      <Navigation aria-hidden className="size-4" />{d.workOrders.openMaps}
                    </a>
                  ) : null}
                </div>
              ) : null}
              {wo.civicReport ? (
                <div className="rounded-md bg-ink-50 p-3 text-sm">
                  <div className="font-medium text-ink-900">{d.workOrders.civicReport} · <Link className="num hover:underline" href={`/${locale}/app/civic/reports/${wo.civicReport.id}`}>{wo.civicReport.trackingCode}</Link></div>
                  <div className="text-ink-700">{d.enums.CivicCategory[wo.civicReport.category]} — {wo.civicReport.description}</div>
                </div>
              ) : null}
              <DescriptionList items={[
                [d.contracts.category, wo.wasteCategory ? name(wo.wasteCategory) : null],
                [d.requests.contract, wo.contract ? <Link className="num hover:underline" href={`/${locale}/app/contracts/${wo.contract.id}`}>{wo.contract.reference}</Link> : null],
                [d.workOrders.team, wo.team?.name ?? d.workOrders.unassigned],
                [d.workOrders.vehicle, wo.vehicle ? <span className="num">{wo.vehicle.plateNumber} · {wo.vehicle.label}</span> : null],
                [d.workOrders.started, formatDateTime(wo.actualStart, locale, ctx.org.timezone)],
                [d.workOrders.finished, formatDateTime(wo.actualEnd, locale, ctx.org.timezone)],
                [d.workOrders.instructions, wo.instructions],
                [d.workOrders.completionNotes, wo.completionNotes],
                ...(wo.failureReason ? [[d.workOrders.failureReason, `${d.enums.FailureReason[wo.failureReason]}${wo.failureNotes ? ` — ${wo.failureNotes}` : ""}`] as [string, string]] : []),
                ...(wo.disputeReason ? [[d.workOrders.disputeReason, wo.disputeReason] as [string, string]] : []),
                ...(wo.customerConfirmedAt ? [[d.workOrders.customerConfirmed, formatDateTime(wo.customerConfirmedAt, locale, ctx.org.timezone)] as [string, string]] : []),
              ]} />
              {canDispatch && ["PLANNED", "ASSIGNED"].includes(wo.status) ? (
                <div className="border-t border-ink-100 pt-4">
                  <AssignForm workOrderId={wo.id} teams={teams.map((t) => ({ id: t.id, name: t.name }))} vehicles={vehicles.map((v) => ({ id: v.id, name: `${v.plateNumber} · ${v.label}` }))} date={wo.scheduledDate.toISOString().slice(0, 10)} defaultTeamId={wo.teamId} defaultVehicleId={wo.vehicleId} />
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={d.workOrders.evidence} />
            <CardBody className="space-y-4">
              {wo.evidence.length === 0 ? <p className="text-sm text-ink-600">{d.workOrders.noEvidence}</p> : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {wo.evidence.map((e) => (
                    <li key={e.id} className="overflow-hidden rounded-md border border-ink-200">
                      {e.mimeType.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/files/${e.id}`} alt={`${d.enums.EvidenceKind[e.kind]} — ${wo.number}`} className="aspect-[4/3] w-full bg-ink-100 object-cover" loading="lazy" />
                      ) : <a href={`/api/files/${e.id}`} className="flex aspect-[4/3] items-center justify-center bg-ink-50 text-sm text-brand-700 underline">PDF</a>}
                      <div className="px-2 py-1 text-xs text-ink-600">{d.enums.EvidenceKind[e.kind]} · {formatDateTime(e.createdAt, locale, ctx.org.timezone)}</div>
                    </li>
                  ))}
                </ul>
              )}
              {canExecute && ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "DISPUTED"].includes(wo.status) ? <EvidenceUpload workOrderId={wo.id} /> : null}
            </CardBody>
          </Card>

          {wo.kind === "COLLECTION" ? (
            <Card>
              <CardHeader title={d.workOrders.weights} description={netTotal ? `${d.workOrders.netKg}: ${formatNumber(netTotal, locale)}` : undefined} />
              {wo.weightTickets.length ? (
                <Table>
                  <thead><tr><Th>{d.workOrders.ticketNumber}</Th><Th numeric>{d.workOrders.grossKg}</Th><Th numeric>{d.workOrders.tareKg}</Th><Th numeric>{d.workOrders.netKg}</Th><Th>{d.workOrders.facility}</Th></tr></thead>
                  <tbody>
                    {wo.weightTickets.map((t) => (
                      <tr key={t.id}>
                        <Td><span className="num">{t.ticketNumber ?? "—"}</span></Td>
                        <Td numeric>{formatNumber(t.grossKg, locale)}</Td>
                        <Td numeric>{formatNumber(t.tareKg, locale)}</Td>
                        <Td numeric className="font-medium">{formatNumber(t.netKg, locale)}</Td>
                        <Td>{t.facility ?? "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : null}
              {canExecute && ["IN_PROGRESS", "COMPLETED"].includes(wo.status) ? <CardBody><WeightForm workOrderId={wo.id} /></CardBody> : null}
            </Card>
          ) : null}
        </div>

        <Card>
          <CardHeader title={d.common.history} />
          <ol className="space-y-3 px-5 py-4 text-sm">
            {wo.history.map((h) => (
              <li key={h.id} className="border-s-2 border-ink-200 ps-3">
                <div className="font-medium text-ink-800">{d.auditActions[h.action.replace("workorder.", "") as keyof typeof d.auditActions] ?? h.action}</div>
                <div className="text-xs text-ink-500">{formatDateTime(h.createdAt, locale, ctx.org.timezone)}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
