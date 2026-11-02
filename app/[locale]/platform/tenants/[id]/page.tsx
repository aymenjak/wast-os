import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { getTenant, listPlans } from "@/server/services/platform";
import { orNotFound } from "@/server/page";
import { formatDateTime, formatDay, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DescriptionList, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { setUserAccessAction } from "@/app/actions/platform";
import { ReactivateForm, SubscriptionForm, SuspendForm, VerificationForm } from "../../forms";

export default async function Tenant({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const [t, plans] = await Promise.all([orNotFound(getTenant(s.user.id, id)), listPlans(s.user.id)]);
  const o = t.org;
  const n = (x: number) => formatNumber(x, locale);
  const action = (a: string) => d.platform.actions[a.replace("platform.", "") as keyof typeof d.platform.actions] ?? a;
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/platform/tenants`} className="hover:underline">{d.platform.nav.tenants}</Link>}
        title={o.name}
        description={<>{d.platform.kinds[o.kind]} · <bdi>{o.slug}</bdi> · {d.platform.tenants.created} {formatDay(o.createdAt, locale)}</>}
        actions={o.suspendedAt ? <Badge tone="danger">{d.platform.tenants.suspendedBadge}</Badge> : o.subscription ? <StatusBadge status={o.subscription.status} label={d.enums.SubscriptionStatus[o.subscription.status]} /> : null}
      />
      {o.suspendedAt ? (
        <p role="alert" className="mb-6 rounded-[var(--radius-card)] border border-danger-700/30 bg-danger-100 px-4 py-3 text-sm text-danger-700">
          {d.platform.tenant.suspendedSince.replace("{date}", formatDateTime(o.suspendedAt, locale)).replace("{reason}", o.suspendedReason ?? "")}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={d.platform.tenant.subscription} />
            <CardBody>
              <SubscriptionForm organizationId={o.id} plans={plans.map((p) => ({ code: p.code, name: `${p.name} (${p.code})` }))}
                current={o.subscription ? { planCode: o.subscription.planCode, status: o.subscription.status, end: o.subscription.currentPeriodEnd.toISOString().slice(0, 10), cycle: o.subscription.billingCycle } : null} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={d.platform.tenant.members} />
            <Table>
              <thead><tr><Th>{d.common.name}</Th><Th>{d.common.email}</Th><Th>{d.platform.staff.role}</Th><Th>{d.common.status}</Th><Th /></tr></thead>
              <tbody>
                {t.members.map((m) => (
                  <tr key={m.id}>
                    <Td><bdi>{m.user.name}</bdi></Td>
                    <Td><span className="num text-xs">{m.user.email}</span></Td>
                    <Td>{d.enums.OrgRole[m.role]}</Td>
                    <Td>
                      {m.user.disabledAt ? <Badge tone="danger">{d.platform.tenant.disabled}</Badge> : m.user.lockedUntil && m.user.lockedUntil > new Date() ? <Badge tone="warning">{d.platform.tenant.locked}</Badge> : <span className="text-xs text-ink-600">{d.enums.MembershipStatus[m.status]}</span>}
                    </Td>
                    <Td className="text-end">
                      {m.user.id === s.user.id ? null : m.user.disabledAt
                        ? <InlineAction action={setUserAccessAction} hidden={{ userId: m.user.id, action: "enable", organizationId: o.id }} label={d.platform.staff.enable} />
                        : <InlineAction action={setUserAccessAction} hidden={{ userId: m.user.id, action: "disable", organizationId: o.id }} label={d.platform.staff.disable} variant="danger" />}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title={d.platform.tenant.log} />
            <CardBody>
              {t.log.length === 0 ? <p className="text-sm text-ink-600">{d.common.noData}</p> : (
                <ol className="space-y-1.5 text-sm">
                  {t.log.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3 border-b border-ink-100 pb-1.5">
                      <span>{action(l.action)}, <bdi>{t.names[l.actorUserId ?? ""] ?? ""}</bdi></span>
                      <time className="shrink-0 text-xs text-ink-600">{formatDateTime(l.createdAt, locale)}</time>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title={d.platform.tenant.profile} />
            <CardBody>
              <DescriptionList items={[
                [d.common.email, o.email ? <span className="num">{o.email}</span> : "—"],
                [d.common.phone, o.phone ? <span className="num">{o.phone}</span> : "—"],
                ["Wilaya", [o.wilaya, o.commune].filter(Boolean).join(", ") || "—"],
                ["NIF", o.taxId ? <span className="num">{o.taxId}</span> : "—"],
                ["RC", o.tradeRegister ? <span className="num">{o.tradeRegister}</span> : "—"],
                [d.platform.tenant.lastActivity, t.lastActivity ? formatDateTime(t.lastActivity, locale) : "—"],
              ]} />
              {o.kind === "MUNICIPALITY" ? <div className="mt-4"><VerificationForm organizationId={o.id} status={o.verificationStatus} /></div> : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={d.platform.tenant.usage} />
            <CardBody>
              <DescriptionList items={o.kind === "MUNICIPALITY"
                ? [[d.platform.tenant.civic30, n(t.usage.civic30)], [d.platform.tenant.workOrders30, n(t.usage.workOrders30)], [d.platform.tenant.vehicles, n(t.usage.vehicles)]]
                : [[d.platform.tenant.customers, n(t.usage.customers)], [d.platform.tenant.vehicles, n(t.usage.vehicles)], [d.platform.tenant.workOrders30, n(t.usage.workOrders30)], [d.platform.tenant.invoices, n(t.usage.invoices)]]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={o.suspendedAt ? d.platform.tenant.reactivate : d.platform.tenant.suspend} />
            <CardBody>{o.suspendedAt ? <ReactivateForm organizationId={o.id} /> : <SuspendForm organizationId={o.id} />}</CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
