import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listMembers } from "@/server/services/accounts";
import { customerOptions } from "@/server/services/customers";
import { assignableRoles } from "@/server/domain/permissions";
import { formatDay } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { revokeInvitationAction, setMemberStatusAction } from "@/app/actions/business";
import { InviteForm, RoleForm } from "./forms";

export default async function TeamPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ customer?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("team.manage")) return <Forbidden message={d.errors.forbiddenPage} />;
  const { customer } = await searchParams;
  const [{ members, invitations }, customers] = await Promise.all([listMembers(ctx), ctx.org.kind === "SERVICE_PROVIDER" ? customerOptions(ctx) : Promise.resolve([])]);
  const roles = assignableRoles(ctx.org.kind).filter((r) => r !== "ADMIN" || ctx.role === "OWNER");
  return (
    <>
      <PageHeader title={d.team.title} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title={d.team.members} />
            <Table>
              <thead><tr><Th>{d.common.name}</Th><Th>{d.team.role}</Th><Th>{d.common.status}</Th><Th>{d.common.actions}</Th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <Td><div className="font-medium text-ink-900">{m.user.name}{m.userId === ctx.userId ? <span className="ms-1 text-xs text-ink-500">({d.team.you})</span> : null}</div><div className="num text-xs text-ink-500">{m.user.email}</div>{m.customer ? <div className="text-xs text-ink-500">{m.customer.name}</div> : null}</Td>
                    <Td>{m.role === "OWNER" || m.role === "CUSTOMER_PORTAL" || m.userId === ctx.userId ? d.enums.OrgRole[m.role] : <RoleForm membershipId={m.id} role={m.role} roles={roles.filter((r) => r !== "CUSTOMER_PORTAL")} />}</Td>
                    <Td><StatusBadge status={m.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED"} label={d.enums.MembershipStatus[m.status]} /></Td>
                    <Td>{m.role !== "OWNER" && m.userId !== ctx.userId ? <InlineAction action={setMemberStatusAction} hidden={{ membershipId: m.id, status: m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }} label={m.status === "ACTIVE" ? d.team.suspend : d.team.reactivate} variant={m.status === "ACTIVE" ? "danger" : "secondary"} /> : null}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          {invitations.length ? (
            <Card>
              <CardHeader title={d.team.pending} />
              <ul className="divide-y divide-ink-100 text-sm">
                {invitations.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                    <span className="num">{i.email}</span>
                    <span className="text-ink-600">{d.enums.OrgRole[i.role]}</span>
                    <span className="text-xs text-ink-500">{d.team.expires} {formatDay(i.expiresAt, locale)}</span>
                    <InlineAction action={revokeInvitationAction} hidden={{ invitationId: i.id }} label={d.team.revoke} variant="danger" />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
        <Card>
          <CardHeader title={d.team.invite} />
          <CardBody><InviteForm roles={roles} customers={customers.map((c) => ({ id: c.id, name: c.name }))} defaultCustomerId={customer} /></CardBody>
        </Card>
      </div>
    </>
  );
}
