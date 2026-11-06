import Link from "next/link";
import { Paperclip } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { listCivicReports } from "@/server/services/civic";
import { formatDateTime } from "@/lib/i18n/format";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import type { CivicReportStatus } from "@/lib/generated/prisma/enums";

const FILTERS = ["OPEN", "SUBMITTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "DISPUTED", "ALL"] as const;
/** A new report should be looked at within 48 hours; past that it is shown as late. */
const REVIEW_WITHIN_MS = 48 * 3600_000;
const reviewBy = (createdAt: Date) => new Date(createdAt.getTime() + REVIEW_WITHIN_MS);

export default async function CivicQueue({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ status?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("civic.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const f = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof FILTERS)[number]) : "OPEN";
  const rows = await listCivicReports(ctx, f === "OPEN" ? { open: true } : f === "ALL" ? {} : { status: f as CivicReportStatus });
  const now = new Date();
  return (
    <>
      <PageHeader title={d.civic.queueTitle} />
      <nav aria-label={d.common.filter} className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((x) => (
          <Link key={x} href={`?status=${x}`} aria-current={x === f ? "page" : undefined} className={`rounded-full px-3 py-1 text-sm ${x === f ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"}`}>
            {x === "ALL" ? d.common.all : x === "OPEN" ? d.civic.open : d.enums.CivicReportStatus[x]}
          </Link>
        ))}
      </nav>
      <Card>
        {rows.length === 0 ? <EmptyState art="done" title={d.civic.noReports} /> : (
          <Table>
            <thead><tr><Th>{d.civic.trackingCode}</Th><Th>{d.civic.category}</Th><Th>{d.civic.submittedAt}</Th><Th>{d.requests.priority}</Th><Th>{d.civic.slaDue}</Th><Th>{d.civic.intervention}</Th><Th>{d.common.status}</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-ink-50/60">
                  <Td><Link href={`/${locale}/app/civic/reports/${r.id}`} className="num font-medium text-ink-900 hover:underline">{r.trackingCode}</Link>{r._count.evidence ? <Paperclip aria-label={d.civic.photosFromCitizen} className="ms-1 inline size-3.5 text-ink-500" /> : null}</Td>
                  <Td>{d.enums.CivicCategory[r.category]}<div className="text-xs text-ink-500">{r.addressHint}</div></Td>
                  <Td>{formatDateTime(r.createdAt, locale, ctx.org.timezone)}</Td>
                  <Td><StatusBadge status={r.priority} label={d.enums.Priority[r.priority]} /></Td>
                  {r.slaDueAt || r.status !== "SUBMITTED" ? (
                    <Td className={r.slaDueAt && r.slaDueAt < now && !["RESOLVED", "CONFIRMED"].includes(r.status) ? "font-medium text-danger-700" : undefined}>{formatDateTime(r.slaDueAt, locale, ctx.org.timezone)}</Td>
                  ) : (
                    // Not reviewed yet: the resolution deadline starts at review, so show the review deadline instead.
                    <Td className={reviewBy(r.createdAt) < now ? "font-medium text-danger-700" : undefined}>
                      {formatDateTime(reviewBy(r.createdAt), locale, ctx.org.timezone)}
                      <div className="text-xs text-ink-500">{d.civic.reviewDeadline}</div>
                    </Td>
                  )}
                  <Td>{r.workOrder ? <span className="num">{r.workOrder.number}</span> : "—"}{r.workOrder?.team ? <div className="text-xs text-ink-500">{r.workOrder.team.name}</div> : null}</Td>
                  <Td><StatusBadge status={r.status} label={d.enums.CivicReportStatus[r.status]} />{r.reopenCount ? <div className="mt-1 text-xs text-danger-700">{d.civic.reopened} ×{r.reopenCount}</div> : null}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
