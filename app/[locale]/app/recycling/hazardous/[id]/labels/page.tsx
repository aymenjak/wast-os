import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { appPage, orNotFound } from "@/server/page";
import { getMovement } from "@/server/services/hazardous";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";

/** One bilingual line of the model label; `red` = the fields marked with an asterisk in the annex (printed in red). */
function Line({ ar, fr, value, red = false }: { ar: string; fr: string; value?: ReactNode; red?: boolean }) {
  const tone = red ? "text-[#c00000]" : "text-ink-950";
  return (
    <div className="border-b border-ink-200 py-1.5 last:border-0">
      <div className={`flex items-baseline justify-between gap-3 ${tone}`}>
        <span lang="fr" dir="ltr" className="text-[13px] font-semibold">{fr}{red ? " *" : ""}</span>
        <span lang="ar" dir="rtl" className="text-[13px] font-semibold">{red ? "* " : ""}{ar}</span>
      </div>
      {value !== undefined ? <div dir="ltr" lang="fr" className={`mt-0.5 text-center text-sm ${tone}`}>{value || <span className="inline-block w-48 border-b border-dotted border-ink-400">&nbsp;</span>}</div> : null}
    </div>
  );
}

/**
 * Labels for the packages of one transport — arrêté interministériel du 2 septembre 2013 fixant les caractéristiques
 * techniques des étiquettes des déchets spéciaux dangereux: content of art. 3, layout of the annex model (Arabic/French,
 * starred items in red), size 1/10 of the package surface (art. 4) — the print size is chosen by the user.
 */
export default async function LabelsPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const m = await orNotFound(getMovement(ctx, id));
  if (!m) notFound();
  const h = d.hazardous;
  const destAddress = [m.destination.address, m.destination.wilaya].filter(Boolean).join(", ");
  const qty = m.packageCount === 1 ? `${formatNumber(Number(m.quantityKg), "fr")} kg` : "";
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/${locale}/app/recycling/hazardous/${m.id}`} className="text-sm text-brand-700 hover:underline">← <span className="num">{m.number}</span></Link>
        <PrintButton />
      </div>
      <p className="mb-4 rounded-md border border-ink-200 bg-white px-4 py-3 text-sm text-ink-700 print:hidden">{h.labelsNote}</p>
      <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
        {Array.from({ length: m.packageCount }, (_, i) => (
          <section key={i} className="break-inside-avoid border-2 border-ink-900 bg-white p-4" aria-label={`${h.label} ${i + 1}/${m.packageCount}`}>
            <div className="border-b-2 border-ink-900 pb-2 text-center text-[#c00000]">
              <div lang="ar" dir="rtl" className="text-lg font-bold">النفايات الخاصة الخطرة *</div>
              <div lang="fr" dir="ltr" className="text-sm font-bold">Déchets spéciaux dangereux *</div>
            </div>
            <Line ar="النفاية" fr="Déchet" value={m.designation} />
            <Line ar="الرمز / النفاية رقم" fr="Code / Déchet n°" value={<><span className="num font-bold">{m.wasteCode}</span> · <span className="num">{m.number}-{i + 1}/{m.packageCount}</span></>} />
            <Line ar="معيار تحديد مدى خطر النفايات" fr="Critère de dangerosité" value={m.hazardCriteria} red />
            <Line ar="بيان الخطر ونصائح الحذر" fr="Indication du risque et conseils de prudence" value="" />
            <Line ar="الكمية (كغ)" fr="Quantité (kg)" value={qty} />
            <Line ar="الاسم والعنوان: المنتج و/أو الحائز" fr="Nom et adresse : générateur et/ou détenteur" value={<>{m.customer.name}{m.originAddress ? <div className="text-xs">{m.originAddress}</div> : null}</>} />
            <Line ar="الاسم والعنوان: المرسل إليه" fr="Nom et adresse : destinataire" value={<>{m.destination.name}{destAddress ? <div className="text-xs">{destAddress}</div> : null}</>} />
            <Line ar="الوجهة" fr="Destination" value={`${m.destination.name} — ${d.enums.DestinationKind[m.destination.kind]}`} />
          </section>
        ))}
      </div>
    </div>
  );
}
