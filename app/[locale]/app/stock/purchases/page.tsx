import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatMinor } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { listItems, listPurchases, listSuppliers } from "@/server/services/stock";
import { orgToday } from "@/server/services/reports";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { StockNav } from "../sub-nav";
import { PurchaseForm, SupplierForm } from "../forms";

export default async function StockPurchasesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  const p = ctx.permissions;
  if (!p.has("fleet.read") && !p.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const s = d.stock;
  const canBuy = p.has("fleet.write") || p.has("invoices.write");
  const [purchases, suppliers, items] = await Promise.all([listPurchases(ctx), listSuppliers(ctx), canBuy ? listItems(ctx) : Promise.resolve([])]);
  const unpaid = purchases.filter((x) => !x.paidAt && !x.voidedAt);
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/stock`} className="hover:underline">{s.title}</Link>} title={s.purchases} description={s.purchasesLead} />
      <StockNav d={d} locale={locale} current="purchases" />
      {unpaid.length ? (
        <p className="mb-4 rounded-[var(--radius-card)] bg-warning-100 px-4 py-3 text-sm text-warning-700">
          {s.unpaidTotal}: <strong>{unpaid.length}</strong> · {formatMinor(unpaid.reduce((n, x) => n + Number(x.totalMinor) + Number(x.vatMinor), 0), locale)}
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {purchases.length === 0 ? <EmptyState art="invoices" title={s.noPurchases} /> : (
            <Table scroll>
              <thead><tr><Th>{s.receipt}</Th><Th>{s.supplier}</Th><Th numeric>{s.totalExclVat}</Th><Th>{d.common.status}</Th></tr></thead>
              <tbody>{purchases.map((x) => (
                <tr key={x.id} className={x.voidedAt ? "opacity-60" : ""}>
                  <Td><Link className="num font-medium text-brand-700 hover:underline" href={`/${locale}/app/stock/purchases/${x.id}`}>{x.number}</Link><div className="text-xs text-ink-600"><bdi>{formatDay(x.receivedOn, locale)}</bdi>{x.supplierInvoiceRef ? <> · <bdi className="num">{x.supplierInvoiceRef}</bdi></> : null}</div></Td>
                  <Td>{x.supplier.name}</Td>
                  <Td numeric>{formatMinor(Number(x.totalMinor), locale)}</Td>
                  <Td><Badge tone={x.voidedAt ? "neutral" : x.paidAt ? "success" : "warning"}>{x.voidedAt ? s.voided : x.paidAt ? s.paid : s.unpaid}</Badge></Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        {canBuy ? (
          <div className="space-y-6 lg:col-span-2">
            <Card><CardHeader title={s.newPurchase} /><CardBody>
              <PurchaseForm today={orgToday(ctx)} suppliers={suppliers.filter((x) => x.active).map((x) => ({ id: x.id, label: x.name }))}
                items={items.map((x) => ({ id: x.id, label: `${x.name} (${d.enums.StockUnit[x.unit]})` }))} />
            </CardBody></Card>
            <Card><CardHeader title={s.suppliers} description={String(suppliers.length)} /><CardBody><SupplierForm /></CardBody></Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
