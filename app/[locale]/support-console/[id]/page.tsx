import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { staffGetTicket } from "@/server/services/support";
import { formatDateTime } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { TicketThread } from "@/components/ticket-thread";
import { startSupportSessionAction } from "@/app/actions/support";
import { StaffReplyForm } from "./reply";

export default async function ConsoleTicket({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const t = await staffGetTicket(s.user.id, id);
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/support-console`} className="hover:underline">{d.support.consoleTitle}</Link>} title={t.subject}
        description={<>{t.organization.name}, <span className="num">{t.number}</span>, {d.enums.TicketStatus[t.status]}</>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardBody className="space-y-6">
          <TicketThread messages={t.messages} names={t.names} d={d} locale={locale} tz="Africa/Algiers" viewer="staff" />
          <StaffReplyForm ticketId={t.id} />
        </CardBody></Card>
        <Card>
          <CardHeader title={d.support.grantTitle} />
          <CardBody className="space-y-3 text-sm">
            {t.activeGrant ? (
              <>
                <p className="text-ink-800">{d.support.activeUntil.replace("{date}", formatDateTime(t.activeGrant.expiresAt, locale))}</p>
                <p className="text-ink-600">{t.activeGrant.reason}</p>
                <form action={startSupportSessionAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="organizationId" value={t.organizationId} />
                  <Button type="submit">{d.support.openWorkspace}</Button>
                </form>
              </>
            ) : <p className="text-ink-600">{d.support.noActiveGrant}</p>}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
