import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { publicMunicipalities } from "@/server/services/civic";
import { ReportForm } from "./report-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).civic.reportTitle };
}

export default async function ReportPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  const municipalities = await publicMunicipalities();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-950">{d.civic.reportTitle}</h1>
      <p className="mt-2 text-ink-600">{d.civic.reportLead}</p>
      {municipalities.length === 0 ? (
        <p role="status" className="mt-8 rounded-md bg-ink-50 p-4 text-sm text-ink-700">{d.civic.noMunicipality}</p>
      ) : (
        <ReportForm municipalities={municipalities.map((m) => ({ slug: m.slug, name: m.name + (m.wilaya ? ` — ${m.wilaya}` : "") }))} />
      )}
    </div>
  );
}
