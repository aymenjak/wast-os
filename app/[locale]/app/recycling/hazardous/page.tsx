import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { prisma } from "@/server/db";
import { listAuthorisations, listMovements } from "@/server/services/hazardous";
import { InlineAction } from "@/components/inline-action";
import { setAuthorisationActiveAction } from "@/app/actions/business";
import { listDestinations } from "@/server/services/recycling";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { AuthorisationForm, MovementForm } from "./forms";

const AUTH_TONE = { valid: "success", expired: "danger", notYet: "warning", withdrawn: "neutral" } as const;
const STATUS_TONE = { DRAFT: "neutral", IN_TRANSIT: "info", DELIVERED: "success", REFUSED: "danger", CANCELLED: "neutral" } as const;

/** Special hazardous waste: carrier authorisation (04-409 art. 13–16) and movement tracking (art. 17–21). */
export default async function HazardousPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("workorders.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const canDispatch = ctx.permissions.has("workorders.dispatch");
  const [authorisations, movements] = await Promise.all([listAuthorisations(ctx), listMovements(ctx)]);
  const usable = authorisations.filter((a) => a.state === "valid").map((a) => ({ id: a.id, number: a.number, codes: a.wasteCodes }));
  const isAdmin = ctx.permissions.has("settings.manage");
  const [customers, destinations, vehicles] = canDispatch || isAdmin
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
        <CardHeader title={d.hazardous.authorisations} description={d.hazardous.authorisationLead} />
        {authorisations.length === 0 ? <CardBody><p className="text-sm text-ink-600">{d.hazardous.authMissing}</p></CardBody> : (
          <Table scroll>
            <thead><tr><Th>{d.hazardous.authNumber}</Th><Th>{d.hazardous.authCodes}</Th><Th>{d.hazardous.authVehicles}</Th><Th>{d.hazardous.route}</Th><Th>{d.common.status}</Th>{isAdmin ? <Th /> : null}</tr></thead>
            <tbody>{authorisations.map((a) => (
              <tr key={a.id} className={a.state === "valid" ? "" : "opacity-70"}>
                <Td><span className="num font-medium">{a.number}</span><div className="text-xs text-ink-600 whitespace-nowrap" dir="ltr">{formatDay(a.validFrom, locale)} → {formatDay(a.validUntil, locale)}</div></Td>
                <Td><span className="num text-xs">{a.wasteCodes.join(", ")}</span></Td>
                <Td><span className="num text-xs">{a.plates.join(", ")}</span></Td>
                <Td><span className="text-xs">{a.loadingPoint} → {a.unloadingPoint}</span></Td>
                <Td><Badge tone={AUTH_TONE[a.state]}>{d.hazardous.authState[a.state]}</Badge></Td>
                {isAdmin ? <Td className="text-end"><InlineAction action={setAuthorisationActiveAction} hidden={{ authorisationId: a.id, active: String(!a.active) }} label={a.active ? d.hazardous.withdraw : d.recycling.enable} /></Td> : null}
              </tr>
            ))}</tbody>
          </Table>
        )}
        {isAdmin ? (
          <details className="border-t border-ink-100 px-5 py-4">
            <summary className="cursor-pointer text-sm font-medium text-brand-700 hover:underline">{d.hazardous.addAuthorisation}</summary>
            <div className="mt-4"><AuthorisationForm vehicles={vehicles} /></div>
          </details>
        ) : null}
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
            <CardHeader title={d.hazardous.newMovement} description={usable.length ? d.hazardous.newMovementLead : d.hazardous.needAuthorisation} />
            <CardBody><MovementForm customers={customers} destinations={licensed} vehicles={vehicles} authorisations={usable} /></CardBody>
          </Card>
        ) : null}
      </div>
    </>
  );
}
