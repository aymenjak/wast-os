import { Check, Minus } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { formatMoney, formatNumber } from "@/lib/i18n/format";
import { prisma } from "@/server/db";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).pricing.title };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  const plans = await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } });
  const limit = (n: number) => (n < 0 ? d.pricing.unlimited : formatNumber(n, locale));
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-ink-950">{d.pricing.title}</h1>
      <p className="mt-3 max-w-2xl text-ink-700">{d.pricing.lead}</p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((p, i) => (
          <section key={p.code} className={cn("flex flex-col rounded-[var(--radius-card)] border bg-white p-6", i === 1 ? "border-brand-600 ring-1 ring-brand-600" : "border-ink-200")}>
            <h2 className="font-semibold text-ink-900">{p.name}</h2>
            <p className="mt-4">
              <span className="num text-3xl font-semibold tracking-tight text-ink-950">{formatMoney(p.priceMonthly, locale)}</span>
              <span className="ms-1 text-sm text-ink-500">{d.pricing.perMonth}</span>
            </p>
            <p className="mt-1 text-xs text-ink-500">
              <span className="num">{formatMoney(p.priceYearly, locale)}</span> {d.pricing.perYear}
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-700">
              <li><span className="num font-medium text-ink-900">{limit(p.maxUsers)}</span> {d.pricing.users}</li>
              <li><span className="num font-medium text-ink-900">{limit(p.maxVehicles)}</span> {d.pricing.vehicles}</li>
              <li><span className="num font-medium text-ink-900">{limit(p.maxCustomers)}</span> {d.pricing.customers}</li>
              <Feature on={p.customerPortal} label={d.pricing.portal} d={d} />
              <Feature on={p.advancedReports} label={d.pricing.advancedReports} d={d} />
            </ul>
            <ButtonLink href={`/${locale}/register`} variant={i === 1 ? "primary" : "secondary"} className="mt-6">{d.pricing.cta}</ButtonLink>
          </section>
        ))}
      </div>
      <div className="mt-8 space-y-1 text-sm text-ink-600">
        <p>{d.pricing.trialNote}</p>
        <p>{d.pricing.enterprise}</p>
        <p>{d.pricing.civicNote}</p>
      </div>
    </div>
  );
}

function Feature({ on, label, d }: { on: boolean; label: string; d: ReturnType<typeof getDictionary> }) {
  return (
    <li className="flex items-center gap-2">
      {on ? <Check aria-hidden className="size-4 text-brand-700" /> : <Minus aria-hidden className="size-4 text-ink-500" />}
      <span className={on ? "" : "text-ink-500"}>{label}</span>
      <span className="sr-only">: {on ? d.pricing.included : d.pricing.notIncluded}</span>
    </li>
  );
}
