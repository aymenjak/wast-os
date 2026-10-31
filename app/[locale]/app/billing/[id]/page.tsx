import Link from "next/link";
import { pdfEnabled } from "@/server/pdf";
import { buttonClass } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { organizationPlatformInvoice } from "@/server/services/billing";
import { platformChargily } from "@/server/payments/chargily";
import { formatDay, formatMinor } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";
import { Logo, Table, Td, Th } from "@/components/ui/misc";
import { PrintButton } from "@/app/[locale]/app/invoices/[id]/forms";
import { PayPlatformInvoice } from "@/components/billing-forms";

type Party = { name?: string | null; address?: string | null; taxId?: string | null; tradeRegister?: string | null; statId?: string | null };

export default async function PlatformInvoicePage({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const sp = await searchParams;
  const inv = await orNotFound(organizationPlatformInvoice(ctx, id));
  const issuer = inv.issuer as Party;
  const billTo = inv.billTo as Party;
  const money = (x: unknown) => <bdi>{formatMinor(toMinor(x as string), locale, inv.currency)}</bdi>;
  const ids = (p: Party) => [p.taxId && `NIF ${p.taxId}`, p.tradeRegister && `RC ${p.tradeRegister}`, p.statId && `NIS ${p.statId}`].filter(Boolean).join(" · ");
  return (
    <article className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/${locale}/app/billing`} className="text-sm text-ink-700 hover:underline">{d.billing.title}</Link>
        <div className="flex gap-2">{inv.status === "ISSUED" && platformChargily() ? <PayPlatformInvoice invoiceId={inv.id} /> : null}{pdfEnabled() ? <a className={buttonClass("secondary", "sm")} href={`/api/billing/invoices/${inv.id}/pdf`}>{d.billing.downloadPdf}</a> : null}<PrintButton /></div>
      </div>
      {sp.payment === "returned" ? <p role="status" className="mb-4 rounded-md bg-success-100 px-3 py-2 text-sm text-success-700 print:hidden">{d.payOnline.returned}</p> : null}
      {sp.payment === "failed" ? <p role="alert" className="mb-4 rounded-md bg-danger-100 px-3 py-2 text-sm text-danger-700 print:hidden">{d.payOnline.failed}</p> : null}
      <header className="flex items-start justify-between gap-6 border-b-2 border-ink-900 pb-4">
        <div>
          <Logo />
          <div className="mt-3 text-sm text-ink-700"><div className="font-semibold text-ink-900">{issuer.name}</div>{issuer.address ? <div>{issuer.address}</div> : null}<div className="num text-xs">{ids(issuer)}</div></div>
        </div>
        <div className="text-end">
          <h1 className="text-3xl text-ink-950">{d.billing.invoiceTitle}</h1>
          <p className="num mt-1 font-semibold">{inv.number}</p>
          <p className="text-sm text-ink-600">{d.invoices.issueDate}: {formatDay(inv.issueDate, locale)}</p>
          <p className="text-sm text-ink-600">{d.invoices.dueDate}: {formatDay(inv.dueDate, locale)}</p>
        </div>
      </header>
      <section className="mt-6 text-sm">
        <h2 className="text-xs font-semibold tracking-wide text-ink-600 uppercase">{d.billing.billTo}</h2>
        <div className="mt-1 font-semibold text-ink-900">{billTo.name}</div>
        {billTo.address ? <div className="text-ink-700">{billTo.address}</div> : null}
        <div className="num text-xs text-ink-700">{ids(billTo)}</div>
      </section>
      <Table className="mt-6">
        <thead><tr><Th>{d.invoices.description}</Th><Th numeric>{d.invoices.total}</Th></tr></thead>
        <tbody>
          <tr>
            <Td>{d.billing.lineLabel.replace("{plan}", inv.planCode).replace("{cycle}", d.billing.cycles[inv.cycle])}<div className="text-xs text-ink-600"><bdi>{formatDay(inv.periodStart, locale)}</bdi> → <bdi>{formatDay(inv.periodEnd, locale)}</bdi></div></Td>
            <Td numeric>{money(inv.subtotal)}</Td>
          </tr>
        </tbody>
      </Table>
      <dl className="ms-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-ink-600">{d.invoices.subtotal}</dt><dd>{money(inv.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-600">{d.invoices.tax} ({inv.taxRateBps / 100}%)</dt><dd>{money(inv.taxTotal)}</dd></div>
        <div className="flex justify-between border-t border-ink-900 pt-1 font-bold"><dt>{d.invoices.total}</dt><dd>{money(inv.total)}</dd></div>
      </dl>
      <p className="mt-6 text-sm font-semibold">{d.billing.status[inv.status]}{inv.paidAt ? ` · ${formatDay(inv.paidAt, locale)}` : ""}</p>
      <p className="mt-8 text-xs text-ink-600">{d.billing.legalNote}</p>
    </article>
  );
}
