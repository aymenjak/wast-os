import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber, formatPercent } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { prisma } from "@/server/db";
import { listCampaigns } from "@/server/services/territory";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { CampaignForm } from "../territory/forms";

const TONE = { planned: "neutral", running: "info", ended: "success" } as const;

/** Sorting campaigns with a before/after comparison (not a measure of effect). */
export default async function CampaignsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const tr = d.territory;
  const [campaigns, locs] = await Promise.all([
    listCampaigns(ctx),
    prisma.serviceLocation.findMany({ where: { organizationId: ctx.org.id, commune: { not: null } }, select: { commune: true }, distinct: ["commune"], take: 200 }),
  ]);
  const canPlan = ctx.permissions.has("settings.manage") || ctx.permissions.has("workorders.dispatch");
  const n = (v: number) => `⁦${formatNumber(v, locale)} kg⁩`;
  const stream = (k: string) => d.enums.MaterialStream[k as keyof typeof d.enums.MaterialStream];
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/recycling`} className="hover:underline">{d.recycling.title}</Link>} title={tr.campaigns} description={tr.campaignsLead} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {campaigns.length === 0 ? <EmptyState art="customers" title={tr.noCampaigns} /> : (
            <Table scroll>
              <thead><tr><Th>{d.common.name}</Th><Th numeric>{tr.before}</Th><Th numeric>{tr.during}</Th><Th numeric>{tr.change}</Th></tr></thead>
              <tbody>{campaigns.map((c) => {
                const change = c.before && c.during && c.before.recoveredKg > 0 ? (c.during.recoveredKg - c.before.recoveredKg) / c.before.recoveredKg : null;
                return (
                  <tr key={c.id}>
                    <Td>
                      <div className="font-medium text-ink-900">{c.name}</div>
                      <div className="text-xs text-ink-600">{c.commune} · <bdi>{formatDay(c.startsOn, locale)}</bdi> – <bdi>{formatDay(c.endsOn, locale)}</bdi> · {c.streams.map(stream).join(", ")}</div>
                      <Badge tone={TONE[c.status]} className="mt-1">{tr.campaignStatus[c.status]}</Badge>
                    </Td>
                    <Td numeric>{c.before ? <>{n(c.before.recoveredKg)}<div className="text-xs text-ink-600">{c.before.rate === null ? "—" : formatPercent(c.before.rate, locale)}</div></> : "—"}</Td>
                    <Td numeric>{c.during ? <>{n(c.during.recoveredKg)}<div className="text-xs text-ink-600">{c.during.rate === null ? "—" : formatPercent(c.during.rate, locale)}</div></> : "—"}</Td>
                    <Td numeric className={change !== null && change < 0 ? "text-danger-700" : ""}>{change === null ? "—" : `${change > 0 ? "+" : ""}${formatPercent(change, locale)}`}</Td>
                  </tr>
                );
              })}</tbody>
            </Table>
          )}
          <p className="px-5 pb-4 text-xs text-ink-600">{tr.campaignMethod}</p>
        </Card>
        {canPlan ? <Card className="lg:col-span-2"><CardHeader title={tr.addCampaign} /><CardBody><CampaignForm communes={locs.map((l) => l.commune!).filter(Boolean)} /></CardBody></Card> : null}
      </div>
    </>
  );
}
