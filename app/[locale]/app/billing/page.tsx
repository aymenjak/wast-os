import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { organizationBilling } from "@/server/services/billing";
import { formatDay, formatMinor } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { DescriptionList, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { PayPlatformInvoice } from "@/components/billing-forms";

export default async function BillingPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  const b = await orNotFound(organizationBilling(ctx));
  const money = (x: unknown) => <bdi>{formatMinor(toMinor(x as string), locale, "DZD")}</bdi>;
  return (
    <>
      <PageHeader title={d.billing.title} description={d.billing.lead} />
      {b.sub ? (
        <Card className="mb-6">
          <CardHeader title={d.settings.subscription} />
          <CardBody>
            <DescriptionList items={[
              [d.settings.plan, `${b.sub.plan.name} · ${d.billing.cycles[b.sub.billingCycle]}`],
              [d.common.status, <StatusBadge key="s" status={b.sub.status} label={d.enums.SubscriptionStatus[b.sub.status]} />],
              [b.sub.status === "TRIAL" ? d.settings.trialEnds : d.billing.nextInvoice, formatDay(b.sub.currentPeriodEnd, locale)],
              [d.billing.price, money(b.sub.billingCycle === "YEARLY" ? b.sub.plan.priceYearly : b.sub.plan.priceMonthly)],
            ]} />
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardHeader title={d.billing.invoices} />
        {b.invoices.length === 0 ? <EmptyState art="invoices" title={d.billing.noInvoices} /> : (
          <Table>
            <thead><tr><Th>{d.invoices.number}</Th><Th>{d.billing.period}</Th><Th>{d.invoices.dueDate}</Th><Th numeric>{d.invoices.total}</Th><Th>{d.common.status}</Th><Th /></tr></thead>
            <tbody>
              {b.invoices.map((i) => {
                const overdue = i.status === "ISSUED" && i.dueDate < b.today;
                return (
                  <tr key={i.id}>
                    <Td><Link className="num font-semibold text-ink-900 hover:underline" href={`/${locale}/app/billing/${i.id}`}>{i.number}</Link></Td>
                    <Td><bdi>{formatDay(i.periodStart, locale)}</bdi> → <bdi>{formatDay(i.periodEnd, locale)}</bdi></Td>
                    <Td>{formatDay(i.dueDate, locale)}</Td>
                    <Td numeric>{money(i.total)}</Td>
                    <Td>{overdue ? <Badge tone="danger">{d.billing.overdue}</Badge> : <StatusBadge status={i.status === "ISSUED" ? "ISSUED" : i.status} label={d.billing.status[i.status]} />}</Td>
                    <Td className="text-end">{i.status === "ISSUED" && b.onlinePayment ? <PayPlatformInvoice invoiceId={i.id} size="sm" /> : null}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {!b.onlinePayment ? <CardBody className="border-t border-ink-100 text-sm text-ink-600">{d.billing.payByTransfer}</CardBody> : null}
      </Card>
    </>
  );
}
