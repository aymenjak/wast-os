import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { prisma } from "@/server/db";
import { hazardousStatus, listMovements } from "@/server/services/hazardous";
import { listDestinations } from "@/server/services/recycling";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { AuthorisationForm, MovementForm } from "./forms";

const STATUS_TONE = { DRAFT: "neutral", IN_TRANSIT: "info", DELIVERED: "success", REFUSED: "danger", CANCELLED: "neutral" } as const;

/** Special hazardous waste: carrier authorisation (04-409 art. 13–16) and movement tracking (art. 17–21). */
export default async function HazardousPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("workorders.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const canDispatch = ctx.permissions.has("workorders.dispatch");
  const [status, movements] = await Promise.all([hazardousStatus(ctx), listMovements(ctx)]);
  const [customers, destinations, vehicles] = canDispatch
    ? await Promise.all([
        prisma.customer.findMany({ where: { organizationId: ctx.org.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
        listDestinations(ctx, { activeOnly: true }),
        prisma.vehicle.findMany({ where: { organizationId: ctx.org.id }, select: { id: true, plateNumber: true }, orderBy: { plateNumber: "asc" } }),
      ])
    : [[], [], []];
  const licensed = destinations.filter((x) => x.registrationNumber).map((x) => ({ id: x.id, name: x.name, registrationNumber: x.registrationNumber! }));
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/recycling`} className="hover:underline">{d.recycling.title}</Link>} title={d.hazardous.title} description={d.hazardous.lead} />
      <Card>
        <CardHeader
          title={d.hazardous.authorisation}
          description={d.hazardous.authorisationLead}
          action={<Badge tone={status.authValid ? "success" : "danger"}>{status.authValid ? d.hazardous.authValid : status.authNumber ? d.hazardous.authExpired : d.hazardous.authMissing}</Badge>}
        />
        <CardBody>
          {ctx.permissions.has("settings.manage") ? <AuthorisationForm number={status.authNumber} expiresOn={status.authExpiresOn} /> : (
            <p className="text-sm text-ink-800"><span className="num">{status.authNumber ?? "—"}</span>{status.authExpiresOn ? <> · {d.hazardous.authExpires} {formatDay(status.authExpiresOn, locale)}</> : null}</p>
          )}
        </CardBody>
      </Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={d.hazardous.movements} description={d.hazardous.officialFormNote} />
          {movements.length === 0 ? <EmptyState art="workOrders" title={d.hazardous.noMovements} /> : (
            <Table scroll>
              <thead><tr><Th>{d.hazardous.number}</Th><Th>{d.hazardous.shipper}</Th><Th>{d.hazardous.wasteCode}</Th><Th numeric>{d.hazardous.quantityKg}</Th></tr></thead>
              <tbody>{movements.map((m) => (
                <tr key={m.id}>
                  <Td><Link className="num font-medium whitespace-nowrap text-brand-700 hover:underline" href={`/${locale}/app/recycling/hazardous/${m.id}`}>{m.number}</Link><div className="mt-1"><Badge tone={STATUS_TONE[m.status]}>{d.enums.HazardousMovementStatus[m.status]}</Badge></div><div className="mt-0.5 text-xs text-ink-600">{formatDay(m.createdAt, locale)}</div></Td>
                  <Td>{m.customer.name}<div className="text-xs text-ink-600">→ {m.destination.name}</div></Td>
                  <Td><span className="num">{m.wasteCode}</span><div className="max-w-44 truncate text-xs text-ink-600" lang="fr" dir="ltr" title={m.designation}>{m.designation}</div></Td>
                  <Td numeric>{formatNumber(Number(m.quantityKg), locale)}</Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        {canDispatch ? (
          <Card className="lg:col-span-2">
            <CardHeader title={d.hazardous.newMovement} description={status.authValid ? d.hazardous.newMovementLead : d.hazardous.needAuthorisation} />
            <CardBody><MovementForm customers={customers} destinations={licensed} vehicles={vehicles} /></CardBody>
          </Card>
        ) : null}
      </div>
    </>
  );
}
