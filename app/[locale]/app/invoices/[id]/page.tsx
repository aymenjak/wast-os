import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { getInvoice } from "@/server/services/invoices";
import { getOrganization } from "@/server/services/accounts";
import { orgToday } from "@/server/services/reports";
import { formatDay, formatMoney, formatNumber } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { Disclosure, InlineAction } from "@/components/inline-action";
import { removeInvoiceLineAction } from "@/app/actions/business";
import { IssueForm, LineForm, PaymentForm, PrintButton, ReverseForm, VoidForm } from "./forms";
import { PayOnline } from "@/components/pay-online";
import { chargilyEnabled } from "@/server/payments/chargily";
import { prisma } from "@/server/db";

export default async function InvoiceDetail({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const [inv, org] = await Promise.all([orNotFound(getInvoice(ctx, id)), getOrganization(ctx)]);
  const canWrite = ctx.permissions.has("invoices.write");
  const canPay = ctx.permissions.has("payments.record");
  const balanceMinor = toMinor(inv.total) - toMinor(inv.amountPaid);
  const money = (v: { toString(): string } | number) => <span className="num">{formatMoney(v, locale, inv.currency)}</span>;
  const today = orgToday(ctx);
  const { payment } = await searchParams;
  const open = inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID";
  const checkouts = await prisma.paymentCheckout.findMany({ where: { organizationId: ctx.org.id, invoiceId: inv.id }, orderBy: { createdAt: "desc" }, take: 10 });
  const due = new Date(new Date(`${today}T00:00:00Z`).getTime() + 30 * 86400_000).toISOString().slice(0, 10);

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          eyebrow={<Link href={`/${locale}/app/invoices`} className="hover:underline">{d.invoices.title}</Link>}
          title={<span className="num">{inv.number ?? d.invoices.draft}</span>}
          description={inv.customer.name}
          actions={<><StatusBadge status={inv.status} label={d.enums.InvoiceStatus[inv.status]} /><PrintButton /></>}
        />
      </div>
      {payment === "returned" ? <p role="status" className="mb-4 rounded-md bg-info-100 px-4 py-3 text-sm text-info-700 print:hidden">{d.payOnline.returned}</p> : null}
      {payment === "failed" ? <p role="alert" className="mb-4 rounded-md bg-danger-100 px-4 py-3 text-sm text-danger-700 print:hidden">{d.payOnline.failed}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 print:border-0 print:shadow-none">
          <CardBody className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="text-sm">
                <div className="text-sm font-semibold text-ink-600">{d.invoices.from}</div>
                <div className="mt-1 font-semibold text-ink-900">{org.legalName ?? org.name}</div>
                {org.address ? <div className="text-ink-700">{org.address}</div> : null}
                <div className="num text-xs text-ink-600">{[org.taxId && `NIF ${org.taxId}`, org.statisticalId && `NIS ${org.statisticalId}`, org.tradeRegister && `RC ${org.tradeRegister}`].filter(Boolean).join(", ")}</div>
              </div>
              <div className="text-sm">
                <div className="text-sm font-semibold text-ink-600">{d.invoices.billTo}</div>
                <div className="mt-1 font-semibold text-ink-900">{inv.billToName ?? inv.customer.name}</div>
                {(inv.billToAddress ?? inv.customer.billingAddress) ? <div className="text-ink-700">{inv.billToAddress ?? inv.customer.billingAddress}</div> : null}
                {(inv.billToTaxId ?? inv.customer.taxId) ? <div className="num text-xs text-ink-600">NIF {inv.billToTaxId ?? inv.customer.taxId}</div> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div><span className="text-ink-500">{d.invoices.issueDate}: </span>{formatDay(inv.issueDate, locale)}</div>
              <div><span className="text-ink-500">{d.invoices.dueDate}: </span>{formatDay(inv.dueDate, locale)}</div>
              {inv.contract ? <div><span className="text-ink-500">{d.invoices.contract}: </span><span className="num">{inv.contract.reference}</span></div> : null}
            </div>
            <Table>
              <thead><tr><Th>{d.invoices.description}</Th><Th numeric>{d.invoices.quantity}</Th><Th numeric>{d.invoices.unitPrice}</Th><Th numeric>{d.invoices.taxRate}</Th><Th numeric>{d.invoices.lineTotal}</Th>{inv.status === "DRAFT" && canWrite ? <Th className="print:hidden" /> : null}</tr></thead>
              <tbody>
                {inv.lines.map((l) => (
                  <tr key={l.id}>
                    <Td>{l.description}</Td>
                    <Td numeric>{formatNumber(l.quantity, locale, 3)}</Td>
                    <Td numeric>{money(l.unitPrice)}</Td>
                    <Td numeric>{formatNumber(l.taxRateBps / 100, locale)}</Td>
                    <Td numeric>{money(l.lineSubtotal)}</Td>
                    {inv.status === "DRAFT" && canWrite ? <Td className="print:hidden"><InlineAction action={removeInvoiceLineAction} hidden={{ invoiceId: inv.id, lineId: l.id }} label="×" variant="danger" /></Td> : null}
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ms-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-600">{d.invoices.subtotal}</dt><dd>{money(inv.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">{d.invoices.tax}</dt><dd>{money(inv.taxTotal)}</dd></div>
              <div className="flex justify-between border-t border-ink-200 pt-1.5 font-semibold"><dt>{d.invoices.total}</dt><dd>{money(inv.total)}</dd></div>
              {inv.status !== "DRAFT" ? <>
                <div className="flex justify-between"><dt className="text-ink-600">{d.invoices.paid}</dt><dd>{money(inv.amountPaid)}</dd></div>
                <div className="flex justify-between font-semibold text-ink-950"><dt>{d.invoices.balance}</dt><dd data-testid="invoice-balance">{money(balanceMinor / 100)}</dd></div>
              </> : null}
            </dl>
            {inv.notes ? <p className="text-sm text-ink-700">{inv.notes}</p> : null}
            {inv.voidReason ? <p className="text-sm text-danger-700">{d.enums.InvoiceStatus.VOID}: {inv.voidReason}</p> : null}
          </CardBody>
        </Card>

        <div className="space-y-6 print:hidden">
          {inv.status === "DRAFT" && canWrite ? (
            <Card>
              <CardHeader title={d.invoices.issue} description={d.invoices.issueHint} />
              <CardBody className="space-y-4">
                {inv.lines.length ? <IssueForm invoiceId={inv.id} today={today} due={due} /> : <p className="text-sm text-ink-600">{d.invoices.noLines}</p>}
                <Disclosure summary={d.invoices.addLine}><LineForm invoiceId={inv.id} defaultTaxBps={ctx.org.defaultTaxRateBps} /></Disclosure>
              </CardBody>
            </Card>
          ) : null}
          {inv.status !== "DRAFT" ? (
            <Card>
              <CardHeader title={d.invoices.payments} />
              {inv.payments.length ? (
                <ul className="divide-y divide-ink-100 text-sm">
                  {inv.payments.map((p) => (
                    <li key={p.id} className="px-5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={p.status === "REVERSED" ? "text-ink-500 line-through" : "font-medium text-ink-900"}>{money(p.amount)}</span>
                        <span className="text-xs text-ink-500">{formatDay(p.receivedAt, locale)}</span>
                      </div>
                      <div className="text-xs text-ink-600">{p.source === "WEBHOOK" ? d.invoices.webhook : d.enums.PaymentMethod[p.method]}{p.reference ? <>, <span className="num">{p.reference}</span></> : null}{p.status === "REVERSED" ? `, ${d.invoices.reversed}` : ""}</div>
                      {canPay && p.status === "RECORDED" ? <ReverseForm paymentId={p.id} invoiceId={inv.id} /> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {canPay && (inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID") ? (
                <CardBody className="border-t border-ink-100"><PaymentForm invoiceId={inv.id} balance={(balanceMinor / 100).toFixed(2)} today={today} /></CardBody>
              ) : null}
            </Card>
          ) : null}
          {open && canPay && chargilyEnabled() ? <PayOnline invoiceId={inv.id} /> : null}
          {checkouts.length ? (
            <Card>
              <CardHeader title={d.payOnline.history} />
              <ul className="divide-y divide-ink-100 text-sm">
                {checkouts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 px-5 py-2">
                    <span>{money(c.amount)}</span>
                    <span className="text-xs text-ink-600">{d.enums.CheckoutStatus[c.status]}{c.livemode ? "" : " (test)"}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          {canWrite && (inv.status === "DRAFT" || inv.status === "ISSUED") ? <Disclosure summary={d.invoices.void}><VoidForm invoiceId={inv.id} /></Disclosure> : null}
        </div>
      </div>
    </>
  );
}
