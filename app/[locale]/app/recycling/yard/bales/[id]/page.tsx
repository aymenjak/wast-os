import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { appPage, orNotFound } from "@/server/page";
import { getBale } from "@/server/services/yard";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";

/** Bale label with a QR code (offline content: number, material, grade, weight, yard — no URL, no personal data). */
export default async function BaleLabel({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const b = await orNotFound(getBale(ctx, id));
  if (!b) notFound();
  const stream = d.enums.MaterialStream[b.stream];
  const payload = ["NEXVO", b.number, b.stream, b.grade ?? "", `${Number(b.weightKg)}kg`, b.createdAt.toISOString().slice(0, 10)].join("|");
  const svg = await QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/${locale}/app/recycling/yard?yard=${b.yardId}`} className="text-sm text-brand-700 hover:underline">← {d.yard.title}</Link>
        <PrintButton />
      </div>
      <section className="border-2 border-ink-900 bg-white p-5" aria-label={b.number}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-ink-600">{b.organization.legalName ?? b.organization.name} · {b.yard.name}</div>
            <div className="num mt-1 text-3xl font-bold text-ink-950">{b.number}</div>
            <div className="mt-2 text-xl font-semibold text-ink-900">{stream}</div>
            {b.grade ? <div className="text-sm text-ink-700">{d.yard.grade}: {b.grade}</div> : null}
          </div>
          {/* eslint-disable-next-line react/no-danger -- SVG generated locally by the qrcode library from our own data */}
          <div className="size-32 shrink-0" role="img" aria-label="QR" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-ink-200 pt-3">
          <div><div className="text-xs text-ink-600">{d.yard.weightKg}</div><div className="num text-2xl font-bold">{formatNumber(b.weightKg, locale)}</div></div>
          <div className="text-end text-sm text-ink-700">{formatDay(b.createdAt, locale)}<div className="text-xs">{d.enums.BaleStatus[b.status]}</div></div>
        </div>
      </section>
    </div>
  );
}
