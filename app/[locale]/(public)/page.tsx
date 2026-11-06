import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { ButtonLink } from "@/components/ui/button";
import { RouteHero } from "@/components/route-hero";
import { Reveal } from "@/components/home/reveal";
import { SpotlightCard } from "@/components/home/spotlight-card";
import { ProductTour } from "@/components/home/product-tour";
import { SensorBin } from "@/components/home/sensor-bin";
import { Marquee } from "@/components/home/marquee";
import { Founders } from "@/components/home/founders";
import { Recycle, TriangleAlert, Warehouse, MapPinned } from "lucide-react";

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  // The page renders alongside the layout, so it checks the segment too (e.g. a browser asking for /favicon.ico).
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const flow = [d.home.flow.request, d.home.flow.dispatch, d.home.flow.field, d.home.flow.invoice, d.home.flow.payment];
  const pillars = [d.home.pillars.evidence, d.home.pillars.mobile, d.home.pillars.bilingual, d.home.pillars.tenancy];
  const shot = (name: string) => `/showcase/${locale}-${name}.jpg`;
  const tour = [
    { id: "dashboard", label: d.home.tour.tabs.dashboard, caption: d.home.tour.captions.dashboard, src: shot("dashboard"), width: 1700, height: 1063 },
    { id: "recycling", label: d.home.tour.tabs.recycling, caption: d.home.tour.captions.recycling, src: shot("recycling"), width: 1700, height: 1063 },
    { id: "iot", label: d.home.tour.tabs.iot, caption: d.home.tour.captions.iot, src: shot("iot"), width: 1700, height: 1063 },
    { id: "invoice", label: d.home.tour.tabs.invoice, caption: d.home.tour.captions.invoice, src: shot("invoice"), width: 1700, height: 1063 },
    { id: "field", label: d.home.tour.tabs.field, caption: d.home.tour.captions.field, src: shot("field"), width: 780, height: 1560, phone: true },
  ];

  return (
    <>
      <section className="bg-ink-50">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 lg:pt-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1.3fr_1fr]">
            <h1 className="text-[2.6rem] leading-[1.02] text-ink-950 sm:text-6xl lg:text-[4.4rem]" style={{ fontStretch: "72%" }}>
              {d.home.title}
            </h1>
            <div className="max-w-md lg:pb-2">
              <p className="text-lg leading-relaxed text-ink-700">{d.home.lead}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={`/${locale}/register`} size="lg">{d.home.ctaPrimary}</ButtonLink>
                <ButtonLink href={`/${locale}/business`} size="lg" variant="secondary">{d.home.ctaSecondary}</ButtonLink>
              </div>
            </div>
          </div>
          <div className="mt-12">
            <RouteHero d={d} />
          </div>
        </div>
      </section>

      <section className="bg-ink-900 py-6" aria-label={d.home.marqueeLabel}>
        <Marquee items={d.home.marquee.split("|")} label={d.home.marqueeLabel} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <h2 className="max-w-2xl text-3xl leading-tight text-ink-950 sm:text-4xl">{d.home.tour.title}</h2>
          <p className="mt-3 max-w-2xl text-ink-700">{d.home.tour.lead}</p>
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <ProductTour tabs={tour} label={d.home.tour.title} note={d.home.tour.note} />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="max-w-2xl text-3xl leading-tight text-ink-950 sm:text-4xl">{d.home.flowTitle2}</h2>
        <p className="mt-3 max-w-2xl text-ink-700">{d.home.flowLead}</p>
        {/* The five stages are a true sequence, drawn as stations on the route line. */}
        <ol className="relative mt-12 grid gap-8 sm:grid-cols-5 sm:gap-6">
          <span aria-hidden className="absolute top-[9px] hidden h-[4px] rounded-full bg-hivis-600 sm:block" style={{ insetInline: "10px" }} />
          {flow.map((s, i) => (
            <li key={s.title} className="relative ps-8 sm:ps-0">
              <span aria-hidden className="absolute start-0 top-0 block size-[22px] rounded-full border-[4px] border-hivis-600 bg-white sm:relative" />
              {i < flow.length - 1 ? <span aria-hidden className="absolute start-[9px] top-6 -bottom-8 w-[4px] rounded-full bg-hivis-600 sm:hidden" /> : null}
              <h3 className="display text-xl font-bold text-ink-900 sm:mt-4">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="text-3xl leading-tight text-ink-950 sm:text-4xl">{d.home.pillarsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <SpotlightCard className="h-full">
                  <span aria-hidden className="mb-3 block h-1 w-10 rounded-full bg-hivis-600" />
                  <h3 className="font-bold text-ink-900">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{p.body}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <h2 className="text-3xl leading-tight text-ink-950 sm:text-4xl">{d.home.sensors.title}</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-700">{d.home.sensors.body}</p>
            <ul className="mt-5 space-y-2 text-sm text-ink-800">
              {d.home.sensors.points.split("|").map((x) => <li key={x} className="flex gap-2"><span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-hivis-600" />{x}</li>)}
            </ul>
          </Reveal>
          <Reveal delay={0.1}><SensorBin t={d.home.sensors.demo} /></Reveal>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <h2 className="text-3xl leading-tight text-ink-950 sm:text-4xl">{d.home.recovery.title}</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-700">{d.home.recovery.body}</p>
            <div className="mt-6"><ButtonLink href={`/${locale}/business`} variant="secondary">{d.home.recovery.cta}</ButtonLink></div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {([[Recycle, d.home.recovery.items.recycling], [Warehouse, d.home.recovery.items.yard], [TriangleAlert, d.home.recovery.items.hazardous], [MapPinned, d.home.recovery.items.territory]] as const).map(([Icon, it], i) => (
              <Reveal key={it.title} delay={i * 0.08}>
                <SpotlightCard className="h-full">
                  <Icon aria-hidden className="mb-3 size-5 text-brand-700" />
                  <h3 className="font-bold text-ink-900">{it.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{it.body}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-200 bg-ink-50" aria-labelledby="founders-title">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-800">{d.founders.eyebrow}</p>
            <h2 id="founders-title" className="mt-2 max-w-2xl text-3xl leading-tight text-ink-950 sm:text-4xl">{d.founders.title}</h2>
            <p className="mt-3 max-w-2xl text-ink-700">{d.founders.lead}</p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10"><Founders d={d} locale={locale} variant="compact" /></Reveal>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-3xl leading-tight text-ink-950 sm:text-4xl">{d.home.civicTitle}</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-700">{d.home.civicBody}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`/${locale}/civic`} variant="secondary">{d.home.civicCta}</ButtonLink>
            <ButtonLink href={`/${locale}/civic/report`} variant="ghost">{d.nav.reportProblem}</ButtonLink>
          </div>
        </div>
        <aside className="self-start border-s-4 border-ink-900 ps-5">
          <h3 className="font-bold text-ink-900">{d.home.honestyTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">{d.home.honestyBody}</p>
        </aside>
      </section>
    </>
  );
}
