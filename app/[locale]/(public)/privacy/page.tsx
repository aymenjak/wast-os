import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).privacy.title };
}

/** Privacy notice (Law 18-07): what the platform records, why, who sees it, how long. Kept in step with PRIVACY-AND-COMPLIANCE.md. */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const p = getDictionary(locale).privacy;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-5xl leading-none text-ink-950" style={{ fontStretch: "72%" }}>{p.title}</h1>
      <p className="mt-5 text-sm text-ink-600">{p.updated}</p>
      <div className="mt-10 space-y-8">
        {p.sections.map((s) => (
          <section key={s.h} className="space-y-2">
            <h2 className="text-lg font-semibold text-ink-900">{s.h}</h2>
            <p className="leading-relaxed text-ink-700">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
