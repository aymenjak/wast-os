import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { platformAudit } from "@/server/services/platform";
import { formatDateTime } from "@/lib/i18n/format";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";

export default async function Audit({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const { events, names } = await platformAudit(s.user.id);
  const label = (a: string) => d.platform.actions[a.replace(/^(platform|support|user)\./, "") as keyof typeof d.platform.actions] ?? a;
  return (
    <>
      <PageHeader title={d.platform.nav.audit} description={d.platform.audit.lead} />
      <Card>
        {events.length === 0 ? <EmptyState title={d.common.noData} /> : (
          <Table scroll>
            <thead><tr><Th>{d.platform.audit.when}</Th><Th>{d.platform.audit.action}</Th><Th>{d.platform.audit.actor}</Th><Th>{d.platform.audit.target}</Th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt, locale)}</Td>
                  <Td>{label(e.action)}</Td>
                  <Td><bdi>{e.actorUserId ? names[e.actorUserId] ?? "—" : "—"}</bdi></Td>
                  <Td>{e.organization ? <Link className="hover:underline" href={`/${locale}/platform/tenants/${e.organization.id}`}>{e.organization.name}</Link> : <span className="num text-xs text-ink-600">{e.entityType} {e.entityId}</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
