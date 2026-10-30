import { ArrowRight, Camera, ClipboardList, FileCheck2, Languages, Lock, Route, Smartphone, Wallet } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  const flow = [
    { icon: ClipboardList, ...d.home.flow.request },
    { icon: Route, ...d.home.flow.dispatch },
    { icon: Camera, ...d.home.flow.field },
    { icon: FileCheck2, ...d.home.flow.invoice },
    { icon: Wallet, ...d.home.flow.payment },
  ];
  const pillars = [
    { icon: Camera, ...d.home.pillars.evidence },
    { icon: Languages, ...d.home.pillars.bilingual },
    { icon: Lock, ...d.home.pillars.tenancy },
    { icon: Smartphone, ...d.home.pillars.mobile },
  ];
  return (
    <>
      <section className="border-b border-ink-100 bg-[linear-gradient(180deg,var(--color-brand-50),white_70%)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="text-sm font-medium text-brand-700">{d.home.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-ink-950 sm:text-5xl">{d.home.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-700">{d.home.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/${locale}/register`} size="lg">
                {d.home.ctaPrimary}
                <ArrowRight aria-hidden className="size-4 rtl:rotate-180" />
              </ButtonLink>
              <ButtonLink href={`/${locale}/business`} size="lg" variant="secondary">{d.home.ctaSecondary}</ButtonLink>
            </div>
          </div>
          <RecordIllustration d={d} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-950">{d.home.flowTitle}</h2>
        <p className="mt-2 max-w-2xl text-ink-600">{d.home.flowLead}</p>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-5">
          {flow.map((s, i) => (
            <li key={s.title} className="bg-white p-5">
              <div className="flex items-center gap-2 text-brand-700">
                <span className="num text-xs font-semibold text-ink-500">0{i + 1}</span>
                <s.icon aria-hidden className="size-4" />
              </div>
              <h3 className="mt-3 font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink-100 bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">{d.home.pillarsTitle}</h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {pillars.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-ink-200">
                  <p.icon aria-hidden className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink-900">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">{d.home.civicTitle}</h2>
          <p className="mt-3 leading-relaxed text-ink-700">{d.home.civicBody}</p>
          <ButtonLink href={`/${locale}/civic`} variant="subtle" className="mt-6">{d.home.civicCta}</ButtonLink>
        </div>
        <div className="rounded-[var(--radius-card)] border border-sand-100 bg-sand-100/50 p-6">
          <h3 className="font-semibold text-ink-900">{d.home.honestyTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{d.home.honestyBody}</p>
        </div>
      </section>
    </>
  );
}

/** Product illustration with clearly fictional sample values — not live data. */
function RecordIllustration({ d }: { d: Awaited<ReturnType<typeof getDictionary>> }) {
  const steps = [
    ["SUBMITTED", d.enums.RequestStatus.SUBMITTED, "08:12"],
    ["ASSIGNED", d.enums.WorkOrderStatus.ASSIGNED, "08:40"],
    ["IN_PROGRESS", d.enums.WorkOrderStatus.IN_PROGRESS, "10:05"],
    ["COMPLETED", d.enums.WorkOrderStatus.COMPLETED, "10:31"],
    ["ISSUED", d.enums.InvoiceStatus.ISSUED, "—"],
  ] as const;
  return (
    <figure aria-hidden className="relative rounded-[var(--radius-card)] border border-ink-200 bg-white p-5 shadow-[var(--shadow-pop)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="num text-xs text-ink-500">WO-00042</div>
          <div className="mt-0.5 font-semibold text-ink-900">{d.enums.WorkOrderKind.COLLECTION} · {d.enums.QuantityUnit.CONTAINER}</div>
        </div>
        <StatusBadge status="COMPLETED" label={d.enums.WorkOrderStatus.COMPLETED} />
      </div>
      <ol className="mt-5 space-y-3 border-s border-ink-200 ps-4">
        {steps.map(([s, label, time]) => (
          <li key={s} className="relative flex items-center justify-between text-sm">
            <span className="absolute -start-[21px] size-2.5 rounded-full border-2 border-white bg-brand-600 ring-1 ring-brand-200" />
            <span className="text-ink-800">{label}</span>
            <span className="num text-xs text-ink-500">{time}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-ink-50 py-2"><div className="text-ink-500">{d.workOrders.netKg}</div><div className="num mt-0.5 font-semibold text-ink-900">2 450</div></div>
        <div className="rounded-md bg-ink-50 py-2"><div className="text-ink-500">{d.workOrders.evidence}</div><div className="num mt-0.5 font-semibold text-ink-900">2</div></div>
        <div className="rounded-md bg-ink-50 py-2"><div className="text-ink-500">{d.invoices.tax}</div><div className="num mt-0.5 font-semibold text-ink-900">19%</div></div>
      </div>
      <figcaption className="mt-4 text-[11px] text-ink-500">Example · Exemple · مثال</figcaption>
    </figure>
  );
}
