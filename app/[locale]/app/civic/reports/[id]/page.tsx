import Link from "next/link";
import { orgToday } from "@/server/services/reports";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { getCivicReport } from "@/server/services/civic";
import { prisma } from "@/server/db";
import { formatDateTime, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, PageHeader } from "@/components/ui/misc";
import { CivicMap } from "../../map/civic-map";
import { ReviewForm } from "./review-form";

export default async function CivicReportDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const r = await orNotFound(getCivicReport(ctx, id));
  const canReview = ctx.permissions.has("civic.review");
  const [teams, vehicles] = canReview && r.nextStatuses.includes("ASSIGNED")
    ? await Promise.all([
        prisma.team.findMany({ where: { organizationId: ctx.org.id, active: true }, orderBy: { name: "asc" } }),
        prisma.vehicle.findMany({ where: { organizationId: ctx.org.id, status: { in: ["AVAILABLE", "IN_SERVICE"] } } }),
      ])
    : [[], []];
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/civic/queue`} className="hover:underline">{d.civic.queueTitle}</Link>}
        title={<span className="num">{r.trackingCode}</span>}
        description={`${d.enums.CivicCategory[r.category]}, ${formatDateTime(r.createdAt, locale, ctx.org.timezone)}`}
        actions={<><StatusBadge status={r.priority} label={d.enums.Priority[r.priority]} /><StatusBadge status={r.status} label={d.enums.CivicReportStatus[r.status]} /></>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={d.common.details} />
            <CardBody className="space-y-4">
              <p className="whitespace-pre-wrap text-ink-800">{r.description}</p>
              <DescriptionList items={[
                [d.civic.addressHint, r.addressHint],
                [`${d.common.latitude}, ${d.common.longitude}`, <span key="c" className="num">{r.latitude.toString()}, {r.longitude.toString()}</span>],
                [d.civic.reporter, r.reporterName || r.reporterContact ? `${r.reporterName ?? ""} ${r.reporterContact ? `, ${r.reporterContact}` : ""}` : d.civic.anonymous],
                [d.civic.slaDue, formatDateTime(r.slaDueAt, locale, ctx.org.timezone)],
                ...(r.rejectionReason ? [[d.common.reason, r.rejectionReason] as [string, string]] : []),
                ...(r.disputeReason ? [[d.civic.disputeReason, r.disputeReason] as [string, string]] : []),
                ...(r.duplicateOf ? [[d.enums.CivicReportStatus.DUPLICATE, <Link key="dup" className="num hover:underline" href={`/${locale}/app/civic/reports/${r.duplicateOf.id}`}>{r.duplicateOf.trackingCode}</Link>] as [string, React.ReactNode]] : []),
              ]} />
              <CivicMap points={[{ id: r.id, lat: Number(r.latitude), lng: Number(r.longitude), status: r.status, label: r.trackingCode, href: "#" }]} />
            </CardBody>
          </Card>
          {r.evidence.length ? (
            <Card>
              <CardHeader title={d.civic.photosFromCitizen} />
              <CardBody>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.evidence.map((e) => <li key={e.id}><img src={`/api/files/${e.id}`} alt={`${d.civic.photosFromCitizen} — ${r.trackingCode}`} className="aspect-[4/3] w-full rounded-md border border-ink-200 bg-ink-100 object-cover" loading="lazy" /></li>)}
                </ul>
              </CardBody>
            </Card>
          ) : null}
          {r.workOrder ? (
            <Card>
              <CardHeader title={d.civic.intervention} action={<StatusBadge status={r.workOrder.status} label={d.enums.WorkOrderStatus[r.workOrder.status]} />} />
              <CardBody className="space-y-3 text-sm">
                <Link className="num font-medium text-brand-700 hover:underline" href={`/${locale}/app/work-orders/${r.workOrder.id}`}>{r.workOrder.number}</Link>
                <div className="text-ink-700">{r.workOrder.team?.name}{r.workOrder.vehicle ? <>, <span className="num">{r.workOrder.vehicle.plateNumber}</span></> : null}</div>
                {r.workOrder.evidence.length ? (
                  <ul className="grid grid-cols-3 gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.workOrder.evidence.map((e) => <li key={e.id}><img src={`/api/files/${e.id}`} alt={`${d.enums.EvidenceKind[e.kind]} — ${r.workOrder!.number}`} className="aspect-[4/3] w-full rounded border border-ink-200 object-cover" /></li>)}
                  </ul>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
        <div className="space-y-6">
          {canReview && r.nextStatuses.length ? (
            <Card>
              <CardHeader title={d.civic.decision} />
              <CardBody>
                <ReviewForm reportId={r.id} next={r.nextStatuses} teams={teams.map((t) => ({ id: t.id, name: t.name }))} vehicles={vehicles.map((v) => ({ id: v.id, name: `${v.plateNumber}, ${v.label}` }))} priority={r.priority} today={orgToday(ctx)} />
              </CardBody>
            </Card>
          ) : null}
          <Card>
            <CardHeader title={d.civic.possibleDuplicates} />
            {r.duplicates.length ? (
              <ul className="divide-y divide-ink-100 text-sm">
                {r.duplicates.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2 px-5 py-2">
                    <Link className="num font-medium hover:underline" href={`/${locale}/app/civic/reports/${x.id}`}>{x.trackingCode}</Link>
                    <span className="text-xs text-ink-500">{formatNumber(x.distance_m, locale, 0)} m</span>
                    <StatusBadge status={x.status} label={d.enums.CivicReportStatus[x.status]} />
                  </li>
                ))}
              </ul>
            ) : <CardBody><p className="text-sm text-ink-600">{d.civic.noDuplicates}</p></CardBody>}
          </Card>
          <Card>
            <CardHeader title={d.civic.timeline} />
            <ol className="space-y-3 px-5 py-4 text-sm">
              {r.events.map((e) => (
                <li key={e.id} className="border-s-2 border-ink-200 ps-3">
                  <div className="font-medium text-ink-800">{d.enums.CivicReportStatus[e.toStatus]}</div>
                  {e.publicNote ? <div className="text-ink-700">{e.publicNote}</div> : null}
                  <div className="text-xs text-ink-500">{formatDateTime(e.createdAt, locale, ctx.org.timezone)}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
