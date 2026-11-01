import type { ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import type { annualDeclaration } from "@/server/services/hazardous";
import { Logo } from "@/components/ui/misc";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";

type Data = Awaited<ReturnType<typeof annualDeclaration>>;

/** Blank line for what only the generator knows (the annex form uses dotted lines). */
const Blank = () => <span aria-hidden className="inline-block min-w-48 flex-1 border-b border-dotted border-ink-400 align-bottom">&nbsp;</span>;
function Row({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2 py-1 text-sm"><span className="text-ink-600">{label}</span>{children ?? <Blank />}</div>;
}

/**
 * Pre-filled draft of the annual declaration of special hazardous waste (décret exécutif 05-315, annex; JORA n° 62/2005).
 * Section order and labels follow the annex. The generator completes, signs and transmits it.
 */
export function HazardousDeclarationView({ data, d, locale, yearPicker }: { data: Data; d: Dictionary; locale: Locale; yearPicker: ReactNode }) {
  const h = d.hazardous;
  const t = (x: number) => `⁦${formatNumber(x, locale)} t⁩`;
  return (
    <article className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">{yearPicker}<PrintButton /></div>
      <p role="note" className="mb-6 rounded-md border border-warning-700/30 bg-warning-100 px-4 py-3 text-sm text-warning-700 print:hidden">
        {h.declarationDraftNote.replace("{date}", formatDay(data.dueBy, locale))}
      </p>
      <header className="border-b-2 border-ink-900 pb-4 text-center">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-4 text-2xl text-ink-950">{h.declarationTitle}</h1>
        <p className="mt-1 text-sm text-ink-700">{h.declarationLegal}</p>
        <p className="mt-2 text-sm"><span className="text-ink-600">{h.year}:</span> <span className="num font-semibold">{data.year}</span></p>
      </header>

      <section className="mt-6">
        <h2 className="text-base font-bold text-ink-900">{h.identification}</h2>
        <Row label={h.companyName}><span className="font-medium">{data.customer.name}</span></Row>
        <Row label={h.companyStatus} />
        <Row label={h.headOffice} />
        <Row label={h.activity} />
        <Row label={h.certification} />
        <Row label={h.wasteManager} />
      </section>

      {data.lines.length === 0 ? <p className="mt-6 text-ink-600">{h.noSdTickets}</p> : data.lines.map((l, i) => (
        <section key={l.categoryId} className="mt-8 break-inside-avoid">
          <h2 className="text-base font-bold text-ink-900">A/{data.lines.length > 1 ? ` ${i + 1}.` : ""} {h.sectionA}</h2>
          <Row label={h.rawMaterial} />
          <Row label={h.wasteName}><span lang="fr" dir="ltr">{l.designation ?? l.categoryName}</span></Row>
          <Row label={h.wasteCode}>{l.code ? <span className="num font-semibold">{l.code} SD</span> : <span className="text-warning-700">{h.codeMissing}</span>}</Row>
          <Row label={h.consistency} />
          <Row label={h.quantityPerYear}><span className="num font-semibold">{t(l.tonnes)}</span>{l.untrackedTonnes > 0 ? <span className="text-xs text-warning-700">({h.untrackedPart}: {t(l.untrackedTonnes)})</span> : null}</Row>
          <Row label={h.composition} />
          <Row label={h.hazardCriteria}>{l.criteria ? <span lang="fr" dir="ltr">{l.criteria}</span> : undefined}</Row>
          <Row label={h.storage} />

          <h2 className="mt-6 text-base font-bold text-ink-900">B/ {h.sectionB}</h2>
          <Row label={h.installationTypes}>{l.installations.length ? <span>{l.installations.join(" · ")}</span> : undefined}</Row>
          <Row label={h.quantitiesTreated}><span className="num">{t(l.c.reuse + l.c.recycling + l.c.valorisation + l.c.elimination)}</span></Row>
          <Row label={h.managementModes} />

          <h2 className="mt-6 text-base font-bold text-ink-900">C/ {h.sectionC}</h2>
          <table className="mt-1 text-sm"><tbody>
            {([["reuse", h.reuse], ["recycling", h.recycling], ["valorisation", h.valorisation], ["elimination", h.elimination]] as const).map(([k, label]) => (
              <tr key={k}><td className="py-0.5 pe-6 text-ink-600">{label}</td><td className="num text-end font-medium">{t(l.c[k])}</td></tr>
            ))}
          </tbody></table>
          <Row label={h.preventionMeasures} />
        </section>
      ))}

      {data.movements.length ? (
        <section className="mt-8 text-sm">
          <h2 className="text-base font-bold text-ink-900">{h.movements}</h2>
          <p className="mt-1 text-ink-700">{data.movements.map((m) => `${m.number} (${m.wasteCode}, ${formatNumber(m.quantityKg, locale)} kg)`).join(" · ")}</p>
        </section>
      ) : null}
      <p className="mt-8 text-xs text-ink-600">{h.declarationMethod.replace("{collector}", data.collector.legalName ?? data.collector.name)}</p>
      <div className="mt-8 flex justify-end"><div className="h-24 w-64 rounded-md border border-dashed border-ink-300 p-2 text-xs text-ink-600">{h.generatorSignature}</div></div>
    </article>
  );
}

export function YearPicker({ year, label, apply }: { year: number; label: string; apply: string }) {
  return (
    <form className="flex items-end gap-2">
      <label className="text-sm text-ink-700">{label}<input name="year" type="number" min={2000} max={2100} defaultValue={year} dir="ltr" className="mt-1 block h-10 w-28 rounded-[var(--radius-control)] border border-ink-300 px-3 text-sm" /></label>
      <button className="h-10 rounded-[var(--radius-control)] border border-ink-300 bg-white px-3 text-sm font-medium text-ink-900 hover:bg-ink-50">{apply}</button>
    </form>
  );
}
