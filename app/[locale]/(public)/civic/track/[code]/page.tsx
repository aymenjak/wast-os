import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/i18n/format";
import { getPublicReport } from "@/server/services/civic";
import { StatusBadge } from "@/components/ui/badge";
import { CitizenFeedback } from "./feedback";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function TrackDetail({ params }: { params: Promise<{ locale: Locale; code: string }> }) {
  const { locale, code } = await params;
  const d = getDictionary(locale);
  const r = await getPublicReport(decodeURIComponent(code));
  if (!r)
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-semibold text-ink-950">{d.civic.trackTitle}</h1>
        <p role="alert" className="mt-4 text-sm text-ink-700">{d.civic.notFound}</p>
      </div>
    );
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-xs text-ink-500">{d.civic.trackingCode}</p>
      <p className="num text-lg font-semibold tracking-wider text-ink-950">{r.trackingCode}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink-950">{d.enums.CivicCategory[r.category]}</h1>
        <StatusBadge status={r.status} label={d.enums.CivicReportStatus[r.status]} />
      </div>
      <p className="mt-1 text-sm text-ink-600">{r.organization.name}{r.addressHint ? ` · ${r.addressHint}` : ""}</p>

      <h2 className="mt-10 text-sm font-semibold text-ink-900">{d.civic.timeline}</h2>
      <ol className="mt-4 space-y-4 border-s border-ink-200 ps-5">
        {r.events.map((e, i) => (
          <li key={i} className="relative">
            <span aria-hidden className="absolute -start-[25px] top-1.5 size-2.5 rounded-full bg-brand-600 ring-4 ring-white" />
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-medium text-ink-900">{d.enums.CivicReportStatus[e.toStatus]}</span>
              <time className="text-xs text-ink-500" dateTime={e.createdAt.toISOString()}>{formatDateTime(e.createdAt, locale)}</time>
            </div>
            {e.publicNote ? <p className="mt-1 text-sm text-ink-700">{e.publicNote}</p> : null}
          </li>
        ))}
      </ol>

      {r.status === "RESOLVED" ? <CitizenFeedback trackingCode={r.trackingCode} /> : null}
    </div>
  );
}
