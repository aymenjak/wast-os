import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { staffListTickets } from "@/server/services/support";
import { formatDateTime } from "@/lib/i18n/format";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";

export default async function Console({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const tickets = await staffListTickets(s.user.id);
  return (
    <>
      <PageHeader title={d.support.consoleTitle} description={d.support.consoleLead} />
      <Card>
        {tickets.length === 0 ? <EmptyState title={d.support.noTickets} /> : (
          <Table>
            <thead><tr><Th>{d.support.subject}</Th><Th>{d.support.workspace}</Th><Th>{d.requests.priority}</Th><Th>{d.support.grantTitle}</Th><Th>{d.common.status}</Th><Th>{d.common.date}</Th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-ink-50/60">
                  <Td><Link href={`/${locale}/support-console/${t.id}`} className="font-semibold text-ink-900 hover:underline">{t.subject}</Link><div className="num text-xs text-ink-600">{t.number}</div></Td>
                  <Td>{t.organization.name}</Td>
                  <Td><StatusBadge status={t.priority} label={d.enums.Priority[t.priority]} /></Td>
                  <Td>{t.grants[0] ? d.support.activeUntil.replace("{date}", formatDateTime(t.grants[0].expiresAt, locale)) : "—"}</Td>
                  <Td>{d.enums.TicketStatus[t.status]}</Td>
                  <Td>{formatDateTime(t.updatedAt, locale)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
