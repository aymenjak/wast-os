import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { ButtonLink } from "@/components/ui/button";
import { RouteHero } from "@/components/route-hero";

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  const flow = [d.home.flow.request, d.home.flow.dispatch, d.home.flow.field, d.home.flow.invoice, d.home.flow.payment];
  const pillars = [d.home.pillars.evidence, d.home.pillars.mobile, d.home.pillars.bilingual, d.home.pillars.tenancy];

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
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {pillars.map((p) => (
              <div key={p.title} className="border-t-2 border-ink-900 pt-3">
                <dt className="font-bold text-ink-900">{p.title}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-700">{p.body}</dd>
              </div>
            ))}
          </dl>
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
