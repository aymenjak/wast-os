import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime, formatMinor, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { getPurchase } from "@/server/services/yard";
import { Badge } from "@/components/ui/badge";
import { Logo, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";
import { markPurchasePaidAction } from "@/app/actions/business";
import { VoidPurchaseForm } from "../../forms";

/** Purchase voucher (bon d'achat), printable, with signature boxes for the seller and the yard. */
export default async function PurchaseVoucher({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const p = await getPurchase(ctx, id);
  if (!p) notFound();
  const y = d.yard;
  const stream = (s: string) => d.enums.MaterialStream[s as keyof typeof d.enums.MaterialStream];
  return (
    <article className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/${locale}/app/recycling/yard/purchases?yard=${p.yardId}`} className="text-sm text-brand-700 hover:underline">← {y.purchases}</Link>
        <div className="flex items-center gap-2">
          {!p.paidAt && !p.voidedAt && ctx.permissions.has("payments.record") ? <InlineAction action={markPurchasePaidAction} hidden={{ purchaseId: p.id }} label={y.markPaid} variant="primary" /> : null}
          <PrintButton />
        </div>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink-900 pb-4">
        <div>
          <Logo />
          <h1 className="mt-4 text-2xl text-ink-950">{y.voucherTitle} <span className="num">{p.number}</span></h1>
          <p className="mt-1 text-sm text-ink-600">{formatDateTime(p.purchasedAt, locale)} · {p.yard.name}</p>
        </div>
        <div className="text-end text-sm text-ink-700">
          <div className="font-semibold text-ink-900">{p.organization.legalName ?? p.organization.name}</div>
          {p.organization.address ? <div>{p.organization.address}</div> : null}
          <div className="num text-xs">{[p.organization.taxId && `NIF ${p.organization.taxId}`, p.organization.tradeRegister && `RC ${p.organization.tradeRegister}`].filter(Boolean).join(" · ")}</div>
          <div className="mt-2"><Badge tone={p.voidedAt ? "neutral" : p.paidAt ? "success" : "warning"}>{p.voidedAt ? y.voided : p.paidAt ? y.paid : y.unpaid}</Badge></div>
        </div>
      </header>
      <p className="mt-4 text-sm"><span className="text-ink-600">{y.supplier}:</span> <span className="font-medium">{p.supplier.name}</span>{p.supplier.phone ? <span className="text-ink-600"> · <span dir="ltr" className="num inline-block">{p.supplier.phone}</span></span> : null}{p.supplier.registrationNumber ? <span className="text-ink-600"> · <span dir="ltr" className="num inline-block">{p.supplier.registrationNumber}</span></span> : null}</p>
      <Table className="mt-4">
        <thead><tr><Th>{d.recycling.stream}</Th><Th>{y.grade}</Th><Th numeric>{d.workOrders.grossKg}</Th><Th numeric>{d.workOrders.tareKg}</Th><Th numeric>{y.netKg}</Th><Th numeric>{y.pricePerKg}</Th><Th numeric>{y.amount}</Th></tr></thead>
        <tbody>{p.lines.map((l) => (
          <tr key={l.id}><Td>{stream(l.stream)}</Td><Td>{l.grade ?? "—"}</Td><Td numeric>{formatNumber(l.grossKg, locale)}</Td><Td numeric>{formatNumber(l.tareKg, locale)}</Td><Td numeric>{formatNumber(l.netKg, locale)}</Td><Td numeric>{formatMinor(l.unitPriceMinorPerKg, locale)}</Td><Td numeric>{formatMinor(Number(l.amountMinor), locale)}</Td></tr>
        ))}</tbody>
        <tfoot><tr><Td className="font-bold">{d.common.total}</Td><Td /><Td /><Td /><Td numeric className="font-bold">{formatNumber(p.lines.reduce((n, l) => n + Number(l.netKg), 0), locale)}</Td><Td /><Td numeric className="font-bold">{formatMinor(Number(p.totalMinor), locale)}</Td></tr></tfoot>
      </Table>
      {p.voidedAt ? <p className="mt-4 rounded-md border border-danger-700/30 bg-danger-100 px-4 py-2 text-sm text-danger-700">{y.voided} · {formatDateTime(p.voidedAt, locale)} — {p.voidReason}</p> : null}
      <p className="mt-6 text-xs text-ink-600">{y.voucherNote}</p>
      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="h-24 rounded-md border border-dashed border-ink-300 p-2 text-xs text-ink-600">{y.sellerSignature}</div>
        <div className="h-24 rounded-md border border-dashed border-ink-300 p-2 text-xs text-ink-600">{y.yardSignature}</div>
      </div>
      {!p.voidedAt && ctx.permissions.has("invoices.write") ? <div className="mt-8 print:hidden"><VoidPurchaseForm purchaseId={p.id} /></div> : null}
    </article>
  );
}
