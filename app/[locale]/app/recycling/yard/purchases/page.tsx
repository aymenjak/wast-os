import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatMinor, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { listPurchases, listSuppliers, listYards } from "@/server/services/yard";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { PurchaseForm, SupplierForm } from "../forms";

export default async function PurchasesPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ yard?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("invoices.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const yards = await listYards(ctx);
  const sp = await searchParams;
  const yard = yards.find((x) => x.id === sp.yard) ?? yards[0];
  const y = d.yard;
  const eyebrow = <Link href={`/${locale}/app/recycling/yard${yard ? `?yard=${yard.id}` : ""}`} className="hover:underline">{y.title}</Link>;
  if (!yard) return <><PageHeader eyebrow={eyebrow} title={y.purchases} /><Card><EmptyState art="workOrders" title={y.noYard} hint={y.noYardHint} /></Card></>;
  const [purchases, suppliers] = await Promise.all([listPurchases(ctx, yard.id), listSuppliers(ctx)]);
  const canWrite = ctx.permissions.has("invoices.write");
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={y.purchases} description={y.purchasesLead} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {purchases.length === 0 ? <EmptyState art="invoices" title={y.noPurchases} /> : (
            <Table scroll>
              <thead><tr><Th>{y.voucher}</Th><Th>{y.supplier}</Th><Th numeric>{y.netKg}</Th><Th numeric>{d.common.total}</Th><Th>{d.common.status}</Th></tr></thead>
              <tbody>{purchases.map((p) => (
                <tr key={p.id} className={p.voidedAt ? "opacity-60" : ""}>
                  <Td><Link className="num font-medium text-brand-700 hover:underline" href={`/${locale}/app/recycling/yard/purchases/${p.id}`}>{p.number}</Link><div className="text-xs text-ink-600">{formatDay(p.purchasedAt, locale)}</div></Td>
                  <Td>{p.supplier.name}</Td>
                  <Td numeric>{formatNumber(p.lines.reduce((n, l) => n + Number(l.netKg), 0), locale)}</Td>
                  <Td numeric>{formatMinor(Number(p.totalMinor), locale)}</Td>
                  <Td><Badge tone={p.voidedAt ? "neutral" : p.paidAt ? "success" : "warning"}>{p.voidedAt ? y.voided : p.paidAt ? y.paid : y.unpaid}</Badge></Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        {canWrite ? (
          <div className="space-y-6 lg:col-span-2">
            <Card><CardHeader title={y.newPurchase} /><CardBody><PurchaseForm yardId={yard.id} suppliers={suppliers.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))} /></CardBody></Card>
            <Card><CardHeader title={y.suppliers} description={`${suppliers.length}`} /><CardBody><SupplierForm /></CardBody></Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
