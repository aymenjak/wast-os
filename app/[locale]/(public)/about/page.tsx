import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { ContactForm } from "./contact-form";
import { Founders } from "@/components/home/founders";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).about.title };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  return (
    <>
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div>
        <h1 className="text-5xl leading-none text-ink-950" style={{ fontStretch: "72%" }}>{d.about.title}</h1>
        <p className="mt-5 leading-relaxed text-ink-700">{d.about.body1}</p>
        <p className="mt-4 leading-relaxed text-ink-700">{d.about.body2}</p>
        <p className="mt-4 text-sm text-ink-500">{d.about.sourcesNote}</p>
      </div>
      <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-ink-900">{d.about.contactTitle}</h2>
        <p className="mt-1 text-sm text-ink-600">{d.about.contactLead}</p>
        <ContactForm />
      </div>
    </div>
    <section id="team" aria-labelledby="team-title" className="scroll-mt-24 border-t border-ink-200 bg-ink-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">{d.founders.eyebrow}</p>
        <h2 id="team-title" className="mt-2 text-3xl leading-tight text-ink-950 sm:text-4xl">{d.founders.title}</h2>
        <p className="mt-3 max-w-2xl text-ink-700">{d.founders.lead}</p>
        <div className="mt-10"><Founders d={d} locale={locale} variant="full" /></div>
      </div>
    </section>
    </>
  );
}
