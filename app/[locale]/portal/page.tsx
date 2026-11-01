import type { Locale } from "@/lib/i18n/config";
import { pdfEnabled } from "@/server/pdf";
import { appPage } from "@/server/page";
import { prisma } from "@/server/db";
import { listRequests } from "@/server/services/requests";
import { listWorkOrders } from "@/server/services/work-orders";
import { listInvoices } from "@/server/services/invoices";
import { wasteCategoryOptions } from "@/server/services/customers";
import { orgToday } from "@/server/services/reports";
import { formatDay, formatMoney } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { Disclosure } from "@/components/inline-action";
import { RequestForm } from "@/components/forms/request-form";
import { FeedbackForm } from "./feedback-form";
import { PayOnline } from "@/components/pay-online";
import { orgChargilyStatus } from "@/server/payments/chargily";

export default async function PortalHome({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ payment?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const customer = await prisma.customer.findFirstOrThrow({
    where: { id: ctx.customerId ?? "__none__", organizationId: ctx.org.id },
    select: { id: true, name: true, locations: { where: { active: true }, select: { id: true, label: true } }, contracts: { where: { status: "ACTIVE" }, select: { id: true, reference: true, title: true } } },
  });
  const [requests, orders, invoices, cats] = await Promise.all([listRequests(ctx), listWorkOrders(ctx), listInvoices(ctx), wasteCategoryOptions(ctx)]);
  const { payment } = await searchParams;
  const online = (await orgChargilyStatus(ctx.org.id)).configured;
  const pdf = pdfEnabled();
  const month = orgToday(ctx).slice(0, 7);
  const name = (x: { nameEn: string; nameFr: string; nameAr: string }) => (locale === "ar" ? x.nameAr : locale === "fr" ? x.nameFr : x.nameEn);
  return (
    <>
      <PageHeader title={d.portal.title} description={d.portal.lead.replace("{customer}", customer.name)} />
      {payment === "returned" ? <p role="status" className="mb-4 rounded-md bg-info-100 px-4 py-3 text-sm text-info-700">{d.payOnline.returned}</p> : null}
      {payment === "failed" ? <p role="alert" className="mb-4 rounded-md bg-danger-100 px-4 py-3 text-sm text-danger-700">{d.payOnline.failed}</p> : null}
      <div className="space-y-6">
        <div className="flex flex-wrap gap-4">
          <a href={`/${locale}/portal/certificate?month=${month}`} className="inline-block text-sm font-medium text-ink-800 underline">{d.certificate.generate}</a>
          <a href={`/${locale}/portal/recovery?month=${month}`} className="inline-block text-sm font-medium text-ink-800 underline">{d.recycling.certificate}</a>
        </div>
        <Disclosure summary={d.portal.newRequest}>
          <RequestForm portal customers={[customer]} categories={cats.map((c) => ({ id: c.id, name: name(c) }))} defaultCustomerId={customer.id} today={orgToday(ctx)} />
        </Disclosure>
        <Card>
          <CardHeader title={d.workOrders.title} />
          {orders.length === 0 ? <EmptyState art="workOrders" title={d.workOrders.empty} /> : (
            <ul className="divide-y divide-ink-100">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="num font-medium text-ink-900">{o.number}</span>
                  <span className="text-ink-600">{formatDay(o.scheduledDate, locale)}, {o.serviceLocation?.label}</span>
                  <StatusBadge status={o.status} label={d.enums.WorkOrderStatus[o.status]} />
                  <div className="ms-auto">{o.status === "COMPLETED" ? <FeedbackForm workOrderId={o.id} /> : null}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title={d.requests.title} />
            {requests.length === 0 ? <EmptyState title={d.requests.empty} /> : (
              <ul className="divide-y divide-ink-100 text-sm">
                {requests.map((r) => <li key={r.id} className="flex items-center justify-between gap-2 px-5 py-2.5"><span className="num">{r.number}</span><span className="text-ink-600">{formatDay(r.preferredDate, locale)}</span><StatusBadge status={r.status} label={d.enums.RequestStatus[r.status]} /></li>)}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title={d.invoices.title} />
            {invoices.length === 0 ? <EmptyState title={d.invoices.empty} /> : (
              <Table>
                <thead><tr><Th>{d.invoices.number}</Th><Th>{d.invoices.dueDate}</Th><Th numeric>{d.invoices.balance}</Th><Th>{d.common.status}</Th>{online ? <Th /> : null}</tr></thead>
                <tbody>{invoices.map((i) => <tr key={i.id}><Td>{pdf ? <a className="num font-medium text-brand-700 hover:underline" href={`/api/invoices/${i.id}/pdf`}>{i.number}</a> : <span className="num">{i.number}</span>}</Td><Td>{formatDay(i.dueDate, locale)}</Td><Td numeric><span className="num">{formatMoney((toMinor(i.total) - toMinor(i.amountPaid)) / 100, locale, i.currency)}</span></Td><Td><StatusBadge status={i.status} label={d.enums.InvoiceStatus[i.status]} /></Td>{online ? <Td>{i.status === "ISSUED" || i.status === "PARTIALLY_PAID" ? <PayOnline invoiceId={i.id} size="sm" /> : null}</Td> : null}</tr>)}</tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
