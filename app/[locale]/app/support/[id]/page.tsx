import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { getTicket } from "@/server/services/support";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Forbidden, PageHeader } from "@/components/ui/misc";
import { TicketThread } from "@/components/ticket-thread";
import { ReplyForm } from "../forms";

export default async function TicketPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (ctx.support) return <Forbidden message={d.errors.forbiddenPage} />;
  const { id } = await params;
  const t = await orNotFound(getTicket(ctx, id));
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/support`} className="hover:underline">{d.support.title}</Link>} title={t.subject}
        description={<><span className="num">{t.number}</span>, {d.enums.TicketCategory[t.category]}</>}
        actions={<StatusBadge status={t.status === "RESOLVED" ? "COMPLETED" : t.status === "WAITING_CUSTOMER" ? "IN_PROGRESS" : "SUBMITTED"} label={d.enums.TicketStatus[t.status]} />} />
      <Card className="max-w-3xl"><CardBody className="space-y-6">
        <TicketThread messages={t.messages} names={t.names} d={d} locale={locale} tz={ctx.org.timezone} viewer="customer" />
        {t.status !== "CLOSED" ? <ReplyForm ticketId={t.id} /> : null}
      </CardBody></Card>
    </>
  );
}
