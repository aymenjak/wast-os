import Link from "next/link";
import { CheckCircle2, Plus } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listRequests } from "@/server/services/requests";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { RequestActions } from "./request-actions";
import type { RequestStatus } from "@/lib/generated/prisma/enums";

const FILTERS: (RequestStatus | "ALL")[] = ["SUBMITTED", "SCHEDULED", "COMPLETED", "REJECTED", "ALL"];

const NUMBER = /^[A-Z]{2,4}-[A-Z0-9-]{1,20}$/;
const ID = /^[a-z0-9]{10,40}$/;

export default async function RequestsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ status?: string; created?: string; approved?: string; wo?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("requests.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const status = FILTERS.includes(sp.status as RequestStatus) ? (sp.status as RequestStatus | "ALL") : "SUBMITTED";
  const rows = await listRequests(ctx, { status: status === "ALL" ? undefined : status });
  const name = (x: { nameEn: string; nameFr: string; nameAr: string }) => (locale === "ar" ? x.nameAr : locale === "fr" ? x.nameFr : x.nameEn);
  return (
    <>
      <PageHeader title={d.requests.title} actions={ctx.permissions.has("requests.write") ? <ButtonLink href={`/${locale}/app/requests/new`}><Plus aria-hidden className="size-4" />{d.requests.new}</ButtonLink> : null} />
      <nav aria-label={d.common.filter} className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link key={f} href={`?status=${f}`} aria-current={f === status ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${f === status ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"}`}>
            {f === "ALL" ? d.common.all : d.enums.RequestStatus[f]}
          </Link>
        ))}
      </nav>
      {/* Confirmation after creating or approving (values come from our own redirect; checked before display). */}
      {sp.approved && NUMBER.test(sp.approved) ? (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-x-2 rounded-[var(--radius-control)] border border-success-100 bg-success-100/60 px-3 py-2.5 text-sm text-success-700">
          <CheckCircle2 aria-hidden className="size-4 shrink-0" />
          <span>{d.requests.approvedNotice}</span>
          {sp.wo && ID.test(sp.wo) ? <Link href={`/${locale}/app/work-orders/${sp.wo}`} className="num font-medium underline">{sp.approved}</Link> : <span className="num font-medium">{sp.approved}</span>}
        </div>
      ) : sp.created && NUMBER.test(sp.created) ? (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-[var(--radius-control)] border border-success-100 bg-success-100/60 px-3 py-2.5 text-sm text-success-700">
          <CheckCircle2 aria-hidden className="size-4 shrink-0" />
          <span>{d.requests.createdNotice.replace("{number}", sp.created)}</span>
        </div>
      ) : null}
      <Card>
        {rows.length === 0 ? <EmptyState art="workOrders" title={d.requests.empty} /> : (
          <Table>
            <thead><tr><Th>{d.requests.number}</Th><Th>{d.requests.customer}</Th><Th>{d.requests.category}</Th><Th>{d.requests.preferredDate}</Th><Th>{d.requests.priority}</Th><Th>{d.requests.source}</Th><Th>{d.common.status}</Th><Th>{d.common.actions}</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  <Td><span className="num font-medium text-ink-900">{r.number}</span></Td>
                  <Td>
                    <div className="font-medium text-ink-900">{r.customer.name}</div>
                    <div className="text-xs text-ink-500">{r.serviceLocation.label}</div>
                  </Td>
                  <Td>{name(r.wasteCategory)}{r.estimatedQuantity ? <div className="text-xs text-ink-500">{formatNumber(r.estimatedQuantity, locale, 3)} {d.enums.QuantityUnit[r.quantityUnit]}</div> : null}</Td>
                  <Td>{formatDay(r.preferredDate, locale)}<div className="text-xs text-ink-500">{d.enums.TimeWindow[r.preferredWindow]}</div></Td>
                  <Td><StatusBadge status={r.priority} label={d.enums.Priority[r.priority]} /></Td>
                  <Td>{d.enums.RequestSource[r.source]}</Td>
                  <Td><StatusBadge status={r.status} label={d.enums.RequestStatus[r.status]} /></Td>
                  <Td>
                    {r.workOrder ? <Link href={`/${locale}/app/work-orders/${r.workOrder.id}`} className="num text-sm font-medium text-brand-700 hover:underline">{r.workOrder.number}</Link>
                      : r.status === "SUBMITTED" && ctx.permissions.has("requests.validate") ? <RequestActions requestId={r.id} /> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
