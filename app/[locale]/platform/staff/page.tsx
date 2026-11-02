import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { findUserAccount, listStaff } from "@/server/services/platform";
import { formatDateTime } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { setUserAccessAction } from "@/app/actions/platform";
import { StaffRoleForm } from "../forms";

export default async function Staff({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const owner = s.user.platformRole === "OWNER";
  const [staff, found] = await Promise.all([listStaff(s.user.id), findUserAccount(s.user.id, q.slice(0, 100))]);
  return (
    <>
      <PageHeader title={d.platform.nav.staff} description={d.platform.staff.lead} />
      <Card>
        <Table>
          <thead><tr><Th>{d.common.name}</Th><Th>{d.platform.staff.email}</Th><Th>{d.platform.staff.role}</Th></tr></thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id}>
                <Td><bdi>{u.name}</bdi>{u.disabledAt ? <Badge tone="danger" className="ms-2">{d.platform.tenant.disabled}</Badge> : null}</Td>
                <Td><span className="num text-xs">{u.email}</span></Td>
                <Td>{owner && u.id !== s.user.id ? <StaffRoleForm email={u.email} role={u.platformRole ?? "NONE"} /> : d.platform.roles[u.platformRole ?? "NONE"]}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <CardBody className="border-t border-ink-100">{owner ? <StaffRoleForm /> : <p className="text-sm text-ink-600">{d.platform.staff.ownerOnly}</p>}</CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader title={d.platform.staff.users} description={d.platform.staff.usersHint} />
        <CardBody>
          <form role="search" className="flex gap-2">
            <label htmlFor="acct-q" className="sr-only">{d.platform.staff.search}</label>
            <input id="acct-q" name="q" defaultValue={q} minLength={3} placeholder={d.platform.staff.search} className="h-9 w-full max-w-sm rounded-[var(--radius-control)] border border-ink-300 bg-white px-3 text-sm" />
            <button className="h-9 rounded-[var(--radius-control)] border border-ink-200 bg-white px-3 text-sm hover:bg-ink-50">{d.platform.staff.find}</button>
          </form>
        </CardBody>
        {q.trim().length >= 3 ? (found.length === 0 ? <CardBody><p className="text-sm text-ink-600">{d.platform.staff.noResults}</p></CardBody> : (
          <Table>
            <thead><tr><Th>{d.common.name}</Th><Th>{d.platform.staff.email}</Th><Th>{d.platform.nav.tenants}</Th><Th>{d.common.status}</Th><Th /></tr></thead>
            <tbody>
              {found.map((u) => {
                const locked = u.lockedUntil && u.lockedUntil > new Date();
                return (
                  <tr key={u.id}>
                    <Td><bdi>{u.name}</bdi>{u.platformRole ? <div className="text-xs text-ink-600">{d.platform.roles[u.platformRole]}</div> : null}</Td>
                    <Td><span className="num text-xs">{u.email}</span></Td>
                    <Td className="text-xs">{u.memberships.map((m) => `${m.organization.name} (${d.enums.OrgRole[m.role]})`).join(", ") || "—"}</Td>
                    <Td>{u.disabledAt ? <Badge tone="danger">{d.platform.tenant.disabled}</Badge> : locked ? <Badge tone="warning">{d.platform.staff.lockedUntil.replace("{date}", formatDateTime(u.lockedUntil!, locale))}</Badge> : "—"}</Td>
                    <Td className="space-x-2 text-end whitespace-nowrap rtl:space-x-reverse">
                      {u.id === s.user.id ? null : <>
                        {locked ? <InlineAction action={setUserAccessAction} hidden={{ userId: u.id, action: "unlock" }} label={d.platform.staff.unlock} /> : null}
                        {u.totpEnabledAt ? <InlineAction action={setUserAccessAction} hidden={{ userId: u.id, action: "reset2fa" }} label={d.platform.staff.reset2fa} /> : null}
                        {u.disabledAt
                          ? <InlineAction action={setUserAccessAction} hidden={{ userId: u.id, action: "enable" }} label={d.platform.staff.enable} />
                          : <InlineAction action={setUserAccessAction} hidden={{ userId: u.id, action: "disable" }} label={d.platform.staff.disable} variant="danger" />}
                      </>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )) : null}
      </Card>
    </>
  );
}
