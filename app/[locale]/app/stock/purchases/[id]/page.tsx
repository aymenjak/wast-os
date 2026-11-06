import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime, formatDay, formatMinor, formatNumber } from "@/lib/i18n/format";
import { appPage, orNotFound } from "@/server/page";
import { getPurchase } from "@/server/services/stock";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DescriptionList, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { MarkPaidForm, VoidPurchaseForm } from "../../forms";

export default async function StockPurchasePage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const p = ctx.permissions;
  if (!p.has("fleet.read") && !p.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const { id } = await params;
  const x = await orNotFound(getPurchase(ctx, id));
  const s = d.stock;
  const lines = x.movements.filter((m) => m.kind === "RECEIPT");
  const canPay = (p.has("payments.record") || p.has("invoices.write")) && !x.paidAt && !x.voidedAt;
  const canVoid = (p.has("fleet.write") || p.has("invoices.write")) && !x.voidedAt;
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/stock/purchases`} className="hover:underline">{s.purchases}</Link>}
        title={<span className="num">{x.number}</span>}
        description={x.supplier.name}
        actions={<Badge tone={x.voidedAt ? "neutral" : x.paidAt ? "success" : "warning"}>{x.voidedAt ? s.voided : x.paidAt ? s.paid : s.unpaid}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={d.common.details} />
            <CardBody>
              <DescriptionList items={[
                [s.receivedOn, <bdi key="d">{formatDay(x.receivedOn, locale)}</bdi>],
                [s.supplierInvoiceRef, x.supplierInvoiceRef ? <bdi key="r" className="num">{x.supplierInvoiceRef}</bdi> : null],
                [s.taxId, x.supplier.taxId ? <bdi key="t" className="num">{x.supplier.taxId}</bdi> : null],
                [s.totalExclVat, formatMinor(Number(x.totalMinor), locale)],
                [s.vat, formatMinor(Number(x.vatMinor), locale)],
                [d.common.total, <strong key="tt">{formatMinor(Number(x.totalMinor) + Number(x.vatMinor), locale)}</strong>],
                ...(x.paidAt ? [[s.paid, <bdi key="p">{formatDateTime(x.paidAt, locale, ctx.org.timezone)}</bdi>] as [string, React.ReactNode]] : []),
                ...(x.voidedAt ? [[s.voided, <span key="v"><bdi>{formatDateTime(x.voidedAt, locale, ctx.org.timezone)}</bdi> · {x.voidReason}</span>] as [string, React.ReactNode]] : []),
              ]} />
            </CardBody>
          </Card>
          <Card>
            <Table scroll>
              <thead><tr><Th>{s.item}</Th><Th numeric>{s.quantity}</Th><Th numeric>{s.unitCost}</Th><Th numeric>{s.totalExclVat}</Th></tr></thead>
              <tbody>{lines.map((m) => (
                <tr key={m.id}>
                  <Td><Link className="font-medium text-brand-700 hover:underline" href={`/${locale}/app/stock/${m.item.id}`}>{m.item.name}</Link><div className="num text-xs text-ink-600">{m.item.code}</div></Td>
                  <Td numeric><span className="num">{formatNumber(Number(m.quantity), locale, 3)}</span> {d.enums.StockUnit[m.item.unit]}</Td>
                  <Td numeric>{formatMinor(Number(m.unitCostMinor ?? 0), locale)}</Td>
                  <Td numeric>{formatMinor(Number(m.valueMinor), locale)}</Td>
                </tr>
              ))}</tbody>
            </Table>
          </Card>
        </div>
        {canPay || canVoid ? (
          <div className="space-y-6">
            {canPay ? <Card><CardHeader title={s.markPaid} /><CardBody><MarkPaidForm purchaseId={x.id} /></CardBody></Card> : null}
            {canVoid ? <Card><CardHeader title={s.voidTitle} /><CardBody><VoidPurchaseForm purchaseId={x.id} /></CardBody></Card> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
