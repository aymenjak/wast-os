import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listGrants, listTickets } from "@/server/services/support";
import { formatDateTime } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { revokeSupportAction } from "@/app/actions/support";
import { GrantForm, TicketForm } from "./forms";

const TONE: Record<string, string> = { OPEN: "SUBMITTED", WAITING_SUPPORT: "SUBMITTED", WAITING_CUSTOMER: "IN_PROGRESS", RESOLVED: "COMPLETED", CLOSED: "CANCELLED" };

export default async function SupportPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (ctx.support) return <Forbidden message={d.errors.forbiddenPage} />;
  const tickets = await listTickets(ctx);
  const canGrant = ctx.permissions.has("team.manage");
  const grants = canGrant ? await listGrants(ctx) : null;
  const now = new Date();
  return (
    <>
      <PageHeader title={d.support.title} description={d.support.lead} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader title={d.support.tickets} />
            {tickets.length === 0 ? <EmptyState title={d.support.noTickets} /> : (
              <ul className="divide-y divide-ink-100">
                {tickets.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <Link href={`/${locale}/app/support/${t.id}`} className="font-semibold text-ink-900 hover:underline">{t.subject}</Link>
                      <div className="text-xs text-ink-600"><span className="num">{t.number}</span>, {d.enums.TicketCategory[t.category]}, {formatDateTime(t.updatedAt, locale, ctx.org.timezone)}</div>
                    </div>
                    <StatusBadge status={TONE[t.status] ?? "PLANNED"} label={d.enums.TicketStatus[t.status]} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title={d.support.newTicket} />
            <CardBody><TicketForm /></CardBody>
          </Card>
        </div>
        {grants ? (
          <Card>
            <CardHeader title={d.support.grantTitle} description={d.support.grantLead} />
            <CardBody className="space-y-5">
              <GrantForm tickets={tickets.filter((t) => t.status !== "CLOSED").map((t) => ({ id: t.id, label: `${t.number}, ${t.subject}` }))} />
              <ul className="space-y-2 text-sm">
                {grants.grants.map((g) => {
                  const active = !g.revokedAt && g.expiresAt > now;
                  return (
                    <li key={g.id} className="rounded-md border border-ink-200 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={active ? "font-semibold text-ink-900" : "text-ink-600"}>
                          {active ? d.support.activeUntil.replace("{date}", formatDateTime(g.expiresAt, locale, ctx.org.timezone)) : g.revokedAt ? d.support.revoked : d.support.expired}
                        </span>
                        {active ? <InlineAction action={revokeSupportAction} hidden={{ grantId: g.id }} label={d.support.revoke} variant="danger" /> : null}
                      </div>
                      <div className="text-xs text-ink-600">{g.reason}, {grants.names[g.grantedById] ?? ""}</div>
                    </li>
                  );
                })}
              </ul>
              <div>
                <h3 className="mb-2 text-sm font-bold text-ink-900">{d.support.log}</h3>
                <ol className="space-y-1.5 text-xs text-ink-700">
                  {grants.log.map((l) => (
                    <li key={l.id} className="flex justify-between gap-3 border-b border-ink-100 pb-1.5">
                      <span>{d.support.logActions[l.action.replace("support.", "") as keyof typeof d.support.logActions] ?? l.action}, <bdi>{grants.names[l.actorUserId ?? ""] ?? ""}</bdi></span>
                      <time className="shrink-0 text-ink-600">{formatDateTime(l.createdAt, locale, ctx.org.timezone)}</time>
                    </li>
                  ))}
                </ol>
              </div>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </>
  );
}
