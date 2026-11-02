import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { platformOverview } from "@/server/services/platform";
import { formatDay, formatMinor, formatNumber } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { MetricStrip, PageHeader, Stat, Table, Td, Th } from "@/components/ui/misc";
import { RankedBars } from "@/components/charts/charts";

export default async function PlatformHome({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const o = await platformOverview(s.user.id);
  const n = (x: number) => formatNumber(x, locale);
  return (
    <>
      <PageHeader title={d.platform.nav.overview} description={d.platform.lead} />
      <p className="mb-6 rounded-[var(--radius-card)] border border-ink-200 bg-white px-4 py-3 text-sm text-ink-700">{d.platform.privacy}</p>
      <MetricStrip className="lg:grid-cols-4">
        <Stat label={d.platform.overview.providers} value={n(o.tenants.SERVICE_PROVIDER ?? 0)} />
        <Stat label={d.platform.overview.municipalities} value={n(o.tenants.MUNICIPALITY ?? 0)} />
        <Stat label={d.platform.overview.users} value={n(o.users)} />
        <Stat label={d.platform.overview.signups30} value={n(o.signups30)} />
      </MetricStrip>
      <MetricStrip className="mt-4 lg:grid-cols-4">
        <Stat label={d.platform.overview.pendingVerification} value={n(o.pendingVerification)} tone={o.pendingVerification ? "warning" : "default"} />
        <Stat label={d.platform.overview.trialsEnding} value={n(o.trialsEnding)} tone={o.trialsEnding ? "warning" : "default"} />
        <Stat label={d.platform.overview.suspended} value={n(o.suspended)} tone={o.suspended ? "danger" : "default"} />
        <Stat label={d.platform.overview.openTickets} value={n(o.openTickets)} sub={`${d.platform.overview.activeGrants}: ${n(o.activeGrants)}`} />
      </MetricStrip>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title={d.platform.overview.listMrr} description={d.platform.overview.listMrrNote} />
          <CardBody><div className="display text-3xl font-bold text-ink-950"><bdi>{formatMinor(o.listMrrMinor, locale, "DZD")}</bdi></div></CardBody>
        </Card>
        <Card>
          <CardHeader title={d.platform.overview.byStatus} />
          <CardBody>
            {Object.keys(o.byStatus).length ? <RankedBars items={Object.entries(o.byStatus).map(([k, v]) => ({ label: d.enums.SubscriptionStatus[k as keyof typeof d.enums.SubscriptionStatus], value: v, display: n(v) }))} /> : <p className="text-sm text-ink-600">{d.common.noData}</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={d.platform.overview.byPlan} />
          <CardBody>
            {Object.keys(o.byPlan).length ? <RankedBars items={Object.entries(o.byPlan).map(([k, v]) => ({ label: k, value: v, display: n(v) }))} /> : <p className="text-sm text-ink-600">{d.common.noData}</p>}
          </CardBody>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title={d.platform.overview.recent} action={<Link className="text-sm font-medium text-ink-800 hover:underline" href={`/${locale}/platform/tenants`}>{d.platform.nav.tenants}</Link>} />
        <Table>
          <thead><tr><Th>{d.common.name}</Th><Th>{d.platform.tenants.kind}</Th><Th>{d.platform.tenants.subscription}</Th><Th>{d.platform.tenants.created}</Th></tr></thead>
          <tbody>
            {o.recent.map((t) => (
              <tr key={t.id}>
                <Td><Link className="font-semibold text-ink-900 hover:underline" href={`/${locale}/platform/tenants/${t.id}`}>{t.name}</Link>{t.suspendedAt ? <Badge tone="danger" className="ms-2">{d.platform.tenants.suspendedBadge}</Badge> : null}</Td>
                <Td>{d.platform.kinds[t.kind]}</Td>
                <Td>{t.subscription ? <StatusBadge status={t.subscription.status} label={`${t.subscription.planCode} · ${d.enums.SubscriptionStatus[t.subscription.status]}`} /> : "—"}</Td>
                <Td>{formatDay(t.createdAt, locale)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
