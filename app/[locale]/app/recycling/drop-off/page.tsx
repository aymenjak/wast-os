import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { prisma } from "@/server/db";
import { listDropOffPoints } from "@/server/services/territory";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader } from "@/components/ui/misc";
import { DropOffMap } from "./map";
import { AssignContainerForm, DropOffForm } from "../territory/forms";

/** Voluntary drop-off points (PAV): containers per material with the latest fill level from the sensors. */
export default async function DropOffPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("fleet.read") && !ctx.permissions.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const tr = d.territory;
  const canWrite = ctx.permissions.has("fleet.write");
  const [points, free] = await Promise.all([
    listDropOffPoints(ctx),
    canWrite ? prisma.container.findMany({ where: { organizationId: ctx.org.id, serviceLocationId: null, dropOffPointId: null, status: { notIn: ["RETIRED", "AT_CUSTOMER"] } }, select: { id: true, code: true }, orderBy: { code: "asc" } }) : Promise.resolve([]),
  ]);
  const stream = (k: string | null) => (k ? d.enums.MaterialStream[k as keyof typeof d.enums.MaterialStream] : "—");
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/recycling`} className="hover:underline">{d.recycling.title}</Link>} title={tr.dropOff} description={tr.dropOffLead} />
      {points.length > 0 ? <Card className="mb-6 overflow-hidden"><DropOffMap points={points.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude, label: `${p.name}${p.full ? ` — ${p.full} ${tr.fullShort}` : ""}`, color: p.full ? "#b91c1c" : "#15803d" }))} label={tr.dropOff} /></Card> : null}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {points.length === 0 ? <Card><EmptyState art="devices" title={tr.noPoints} /></Card> : points.map((p) => (
            <Card key={p.id}>
              <CardHeader title={p.name} description={[p.commune, p.wilaya, p.address].filter(Boolean).join(" · ")} action={p.full ? <Badge tone="danger">{p.full} {tr.fullShort}</Badge> : <Badge tone="success">{tr.ok}</Badge>} />
              <CardBody>
                {p.containers.length === 0 ? <p className="text-sm text-ink-600">{tr.noContainers}</p> : (
                  <ul className="space-y-3">{p.containers.map((c) => {
                    const full = c.lastFillPct !== null && c.lastFillPct >= c.fillThresholdPct;
                    return (
                      <li key={c.id}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span><Link className="num font-medium text-brand-700 hover:underline" href={`/${locale}/app/containers/${c.id}`}>{c.code}</Link> · {stream(c.stream)}</span>
                          <span className={`num ${full ? "font-semibold text-danger-700" : "text-ink-700"}`}>{c.lastFillPct === null ? tr.noReading : `${c.lastFillPct}%`}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.lastFillPct ?? 0} aria-label={c.code}>
                          <div className={`h-full ${full ? "bg-danger-700" : "bg-brand-600"}`} style={{ width: `${c.lastFillPct ?? 0}%` }} />
                        </div>
                        {c.lastFillAt ? <div className="mt-0.5 text-xs text-ink-600">{formatDateTime(c.lastFillAt, locale)}</div> : null}
                      </li>
                    );
                  })}</ul>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
        {canWrite ? (
          <div className="space-y-6 lg:col-span-2">
            <Card><CardHeader title={tr.addPoint} /><CardBody><DropOffForm /></CardBody></Card>
            {points.length ? <Card><CardHeader title={tr.placeContainer} description={tr.placeContainerLead} /><CardBody><AssignContainerForm points={points.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))} containers={free} /></CardBody></Card> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
