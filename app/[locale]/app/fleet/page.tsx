import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listTeams, listVehicles, staffOptions } from "@/server/services/fleet";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { Disclosure } from "@/components/inline-action";
import { AddMemberForm, RemoveMember, TeamForm, VehicleForm } from "./forms";

export default async function FleetPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("fleet.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const canWrite = ctx.permissions.has("fleet.write");
  const [vehicles, teams, staff] = await Promise.all([listVehicles(ctx), listTeams(ctx), canWrite ? staffOptions(ctx) : Promise.resolve([])]);
  const staffOpts = staff.map((s) => ({ id: s.id, name: `${s.user.name}, ${d.enums.OrgRole[s.role]}` }));
  return (
    <>
      <PageHeader title={d.fleet.title} />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader title={d.fleet.vehicles} />
          {vehicles.length === 0 ? <EmptyState title={d.fleet.noVehicles} /> : (
            <Table>
              <thead><tr><Th>{d.fleet.plate}</Th><Th>{d.fleet.type}</Th><Th numeric>{d.fleet.capacity}</Th><Th>{d.fleet.lastService}</Th><Th numeric>{d.fleet.jobs30}</Th><Th>{d.common.status}</Th></tr></thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-ink-50/60">
                    <Td><Link href={`/${locale}/app/fleet/${v.id}`} className="num font-medium text-ink-900 hover:underline">{v.plateNumber}</Link><div className="text-xs text-ink-500">{v.label}</div></Td>
                    <Td>{d.enums.VehicleType[v.type]}</Td>
                    <Td numeric>{v.capacityKg ? formatNumber(v.capacityKg, locale) : "—"}</Td>
                    <Td>{v.maintenance[0] ? formatDay(v.maintenance[0].performedAt, locale) : "—"}</Td>
                    <Td numeric>{v._count.workOrders}</Td>
                    <Td><StatusBadge status={v.status} label={d.enums.VehicleStatus[v.status]} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {canWrite ? <CardBody className="border-t border-ink-100"><Disclosure summary={d.fleet.newVehicle} defaultOpen={vehicles.length === 0}><VehicleForm /></Disclosure></CardBody> : null}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title={d.fleet.teams} />
          {teams.length === 0 ? <EmptyState title={d.fleet.noTeams} /> : (
            <ul className="divide-y divide-ink-100">
              {teams.map((t) => (
                <li key={t.id} className="space-y-2 px-5 py-3">
                  <div className="font-medium text-ink-900">{t.name}</div>
                  <ul className="flex flex-wrap gap-1.5">
                    {t.members.map((m) => (
                      <li key={m.membershipId} className="inline-flex items-center gap-1 rounded-full bg-ink-100 py-0.5 ps-2.5 pe-1 text-xs text-ink-800">
                        {m.membership.user.name}
                        {canWrite ? <RemoveMember teamId={t.id} membershipId={m.membershipId} /> : null}
                      </li>
                    ))}
                  </ul>
                  {canWrite ? <AddMemberForm teamId={t.id} staff={staffOpts.filter((s) => !t.members.some((m) => m.membershipId === s.id))} /> : null}
                </li>
              ))}
            </ul>
          )}
          {canWrite ? <CardBody className="border-t border-ink-100"><TeamForm /></CardBody> : null}
        </Card>
      </div>
    </>
  );
}
