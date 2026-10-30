import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { ContactForm } from "./contact-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).about.title };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-ink-950">{d.about.title}</h1>
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
  );
}
