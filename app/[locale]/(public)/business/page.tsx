import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { ButtonLink } from "@/components/ui/button";
import { BarChart3, ClipboardCheck, FileText, Receipt, Route, Smartphone, Truck, Users, Globe } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).businessPage.title };
}

export default async function BusinessPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  const m = d.businessPage.modules;
  const items = [
    [Users, m.crm], [FileText, m.contracts], [ClipboardCheck, m.requests], [Route, m.dispatch], [Smartphone, m.field],
    [Truck, m.fleet], [Receipt, m.billing], [BarChart3, m.reports], [Globe, m.portal],
  ] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-ink-950">{d.businessPage.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-700">{d.businessPage.lead}</p>
      <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([Icon, mod]) => (
          <div key={mod.title} className="bg-white p-6">
            <Icon aria-hidden className="size-5 text-brand-700" />
            <h2 className="mt-3 font-semibold text-ink-900">{mod.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{mod.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href={`/${locale}/register`} size="lg">{d.nav.startTrial}</ButtonLink>
        <ButtonLink href={`/${locale}/pricing`} size="lg" variant="secondary">{d.nav.pricing}</ButtonLink>
      </div>
    </div>
  );
}
