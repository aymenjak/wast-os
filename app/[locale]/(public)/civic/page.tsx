import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).civicPage.title };
}

export default async function CivicPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  const s = d.civicPage.steps;
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-5xl leading-none text-ink-950" style={{ fontStretch: "72%" }}>{d.civicPage.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-700">{d.civicPage.lead}</p>
      <ol className="mt-12 grid gap-6 md:grid-cols-4">
        {[s.report, s.verify, s.assign, s.confirm].map((step, i) => (
          <li key={step.title} className="border-t-4 border-hivis-600 pt-4">
            <span className="num text-xs font-semibold text-ink-500">0{i + 1}</span>
            <h2 className="mt-1 font-semibold text-ink-900">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-12 max-w-2xl rounded-[var(--radius-card)] bg-ink-50 p-4 text-sm text-ink-700">{d.civicPage.pilotNote}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href={`/${locale}/civic/report`} size="lg">{d.civicPage.reportCta}</ButtonLink>
        <ButtonLink href={`/${locale}/civic/track`} size="lg" variant="secondary">{d.civicPage.trackCta}</ButtonLink>
      </div>
    </div>
  );
}
