import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime, formatMinor, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { getSale } from "@/server/services/yard";
import { Badge } from "@/components/ui/badge";
import { Logo, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";
import { cancelSaleAction, settleSaleAction } from "@/app/actions/business";
import { ClaimForm, DeliverSaleForm } from "../../forms";

const TONE = { DRAFT: "neutral", DELIVERED: "info", SETTLED: "success", CANCELLED: "neutral" } as const;

/** Sale of sorted material — printable delivery note (bon de livraison); amounts excluding tax. */
export default async function SalePage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const s = await getSale(ctx, id);
  if (!s) notFound();
  const y = d.yard;
  const stream = (x: string) => d.enums.MaterialStream[x as keyof typeof d.enums.MaterialStream];
  const bale = new Map(s.bales.map((b) => [b.id, b.number]));
  const totalKg = s.lines.reduce((n, l) => n + Number(l.weightKg), 0);
  const canWrite = ctx.permissions.has("invoices.write");
  return (
    <article className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/${locale}/app/recycling/yard/sales?yard=${s.yardId}`} className="text-sm text-brand-700 hover:underline">← {y.sales}</Link>
        <PrintButton />
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink-900 pb-4">
        <div>
          <Logo />
          <h1 className="mt-4 text-2xl text-ink-950">{y.deliveryNote} <span className="num">{s.number}</span></h1>
          <p className="mt-1 text-sm text-ink-600">{formatDateTime(s.deliveredAt ?? s.createdAt, locale)} · {s.yard.name}</p>
        </div>
        <div className="text-end text-sm text-ink-700">
          <div className="font-semibold text-ink-900">{s.organization.legalName ?? s.organization.name}</div>
          {s.organization.address ? <div>{s.organization.address}</div> : null}
          <div className="num text-xs">{[s.organization.taxId && `NIF ${s.organization.taxId}`, s.organization.tradeRegister && `RC ${s.organization.tradeRegister}`].filter(Boolean).join(" · ")}</div>
          <div className="mt-2"><Badge tone={TONE[s.status]}>{d.enums.MaterialSaleStatus[s.status]}</Badge></div>
        </div>
      </header>
      <p className="mt-4 text-sm"><span className="text-ink-600">{y.buyer}:</span> <span className="font-medium">{s.buyer.name}</span>{s.buyer.registrationNumber ? <span className="text-ink-600"> · <span dir="ltr" className="num inline-block">{s.buyer.registrationNumber}</span></span> : null}{s.buyer.address ? <span className="text-ink-600"> · {s.buyer.address}</span> : null}</p>
      <Table className="mt-4">
        <thead><tr><Th>{y.bale}</Th><Th>{d.recycling.stream}</Th><Th>{y.grade}</Th><Th numeric>{y.weightKg}</Th><Th numeric>{y.pricePerKg}</Th><Th numeric>{y.amount}</Th></tr></thead>
        <tbody>{s.lines.map((l) => (
          <tr key={l.id}><Td><span className="num">{l.baleId ? bale.get(l.baleId) ?? "—" : y.loose}</span></Td><Td>{stream(l.stream)}</Td><Td>{l.grade ?? "—"}</Td><Td numeric>{formatNumber(l.weightKg, locale)}</Td><Td numeric>{formatMinor(l.unitPriceMinorPerKg, locale)}</Td><Td numeric>{formatMinor(Number(l.amountMinor), locale)}</Td></tr>
        ))}</tbody>
        <tfoot><tr><Td className="font-bold">{d.common.total}</Td><Td /><Td /><Td numeric className="font-bold">{formatNumber(totalKg, locale)}</Td><Td /><Td numeric className="font-bold">{formatMinor(Number(s.totalMinor), locale)}</Td></tr></tfoot>
      </Table>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {s.buyerWeighedKg ? <div><dt className="text-xs text-ink-600">{y.buyerWeighedKg}</dt><dd className="num">{formatNumber(s.buyerWeighedKg, locale)} ({formatNumber(Number(s.buyerWeighedKg) - totalKg, locale)})</dd></div> : null}
        {s.claimReason ? <div className="sm:col-span-2"><dt className="text-xs text-ink-600">{y.claim}</dt><dd>{s.claimKg ? <span className="num">{formatNumber(s.claimKg, locale)} kg · </span> : null}{s.claimAmountMinor !== null ? <span className="num">−{formatMinor(Number(s.claimAmountMinor), locale)} · </span> : null}{s.claimReason}</dd></div> : null}
        {s.claimAmountMinor !== null ? <div><dt className="text-xs text-ink-600">{y.netAmount}</dt><dd className="num font-semibold">{formatMinor(Number(s.totalMinor - (s.claimAmountMinor ?? 0n)), locale)}</dd></div> : null}
      </dl>
      <p className="mt-6 text-xs text-ink-600">{y.taxNote}</p>
      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="h-24 rounded-md border border-dashed border-ink-300 p-2 text-xs text-ink-600">{y.yardSignature}</div>
        <div className="h-24 rounded-md border border-dashed border-ink-300 p-2 text-xs text-ink-600">{y.buyerSignature}</div>
      </div>
      {canWrite ? (
        <section className="mt-8 space-y-4 rounded-md bg-ink-50 p-4 print:hidden">
          {s.status === "DRAFT" ? <><DeliverSaleForm saleId={s.id} /><InlineAction action={cancelSaleAction} hidden={{ saleId: s.id }} label={d.common.cancel} /></> : null}
          {s.status === "DELIVERED" ? <><ClaimForm saleId={s.id} />{ctx.permissions.has("payments.record") ? <InlineAction action={settleSaleAction} hidden={{ saleId: s.id }} label={y.markSettled} variant="primary" /> : null}</> : null}
        </section>
      ) : null}
    </article>
  );
}
