import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { daysOnSite, listContainers } from "@/server/services/containers";
import { formatNumber } from "@/lib/i18n/format";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, MetricStrip, PageHeader, Stat, Table, Td, Th } from "@/components/ui/misc";
import { Disclosure } from "@/components/inline-action";
import { ContainerForm } from "./forms";

export default async function ContainersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("fleet.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const rows = await listContainers(ctx);
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  return (
    <>
      <PageHeader title={d.containers.title} description={d.containers.lead} />
      <MetricStrip className="mb-6">
        <Stat label={d.enums.ContainerStatus.AT_CUSTOMER} value={formatNumber(count("AT_CUSTOMER"), locale)} />
        <Stat label={d.enums.ContainerStatus.IN_YARD} value={formatNumber(count("IN_YARD"), locale)} />
        <Stat label={d.enums.ContainerStatus.MAINTENANCE} value={formatNumber(count("MAINTENANCE"), locale)} tone={count("MAINTENANCE") ? "warning" : "default"} />
        <Stat label={d.common.total} value={formatNumber(rows.filter((r) => r.status !== "RETIRED").length, locale)} />
      </MetricStrip>
      <Card>
        {rows.length === 0 ? <EmptyState title={d.containers.empty} /> : (
          <Table>
            <thead><tr><Th>{d.containers.code}</Th><Th>{d.containers.type}</Th><Th>{d.containers.status}</Th><Th>{d.containers.location}</Th><Th numeric>{d.containers.since}</Th></tr></thead>
            <tbody>
              {rows.map((c) => {
                const days = daysOnSite(c.placedAt);
                return (
                  <tr key={c.id} className="hover:bg-ink-50/60">
                    <Td><Link href={`/${locale}/app/containers/${c.id}`} className="num font-semibold text-ink-900 hover:underline">{c.code}</Link></Td>
                    <Td>{d.enums.ContainerType[c.type]}</Td>
                    <Td><StatusBadge status={c.status === "AT_CUSTOMER" ? "IN_PROGRESS" : c.status === "IN_YARD" ? "AVAILABLE" : c.status} label={d.enums.ContainerStatus[c.status]} /></Td>
                    <Td>{c.serviceLocation ? <><Link className="hover:underline" href={`/${locale}/app/customers/${c.serviceLocation.customer.id}`}>{c.serviceLocation.customer.name}</Link><div className="text-xs text-ink-600">{c.serviceLocation.label}</div></> : "—"}</Td>
                    <Td numeric className={days != null && days > 30 ? "font-semibold text-warning-700" : undefined}>{days != null ? d.containers.daysOnSite.replace("{days}", formatNumber(days, locale)) : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {ctx.permissions.has("fleet.write") ? <CardBody className="border-t border-ink-100"><Disclosure summary={d.containers.new} defaultOpen={rows.length === 0}><ContainerForm /></Disclosure></CardBody> : null}
      </Card>
    </>
  );
}
