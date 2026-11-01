import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { listYards, yardStock } from "@/server/services/yard";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { voidBaleAction } from "@/app/actions/business";
import { AdjustmentForm, BaleForm } from "./forms";

/** R2 — the organization's own sorting yard: bulk stock by material, bales in stock, baling, rejects and adjustments. */
export default async function YardPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ yard?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const p = ctx.permissions;
  if (!p.has("workorders.read") && !p.has("reports.read") && !p.has("invoices.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const yards = await listYards(ctx);
  const y = d.yard;
  const header = <PageHeader eyebrow={<Link href={`/${locale}/app/recycling`} className="hover:underline">{d.recycling.title}</Link>} title={y.title} description={y.lead} />;
  if (yards.length === 0) {
    return <>{header}<Card><EmptyState art="workOrders" title={y.noYard} hint={y.noYardHint} action={p.has("settings.manage") ? <Link className={buttonClass("primary", "sm")} href={`/${locale}/app/recycling/destinations`}>{d.recycling.destinations}</Link> : undefined} /></Card></>;
  }
  const sp = await searchParams;
  const yard = yards.find((x) => x.id === sp.yard) ?? yards[0]!;
  const stock = await yardStock(ctx, yard.id);
  const stream = (s: string) => d.enums.MaterialStream[s as keyof typeof d.enums.MaterialStream];
  const q = `?yard=${yard.id}`;
  return (
    <>
      {header}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {yards.length > 1 ? yards.map((x) => <Link key={x.id} href={`?yard=${x.id}`} className={buttonClass(x.id === yard.id ? "primary" : "secondary", "sm")}>{x.name}</Link>) : <span className="text-sm font-medium text-ink-900">{yard.name}</span>}
        <span className="flex-1" />
        {p.has("invoices.read") ? <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/yard/purchases${q}`}>{y.purchases}</Link> : null}
        {p.has("invoices.read") ? <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/yard/sales${q}`}>{y.sales}</Link> : null}
        {p.has("reports.read") ? <Link className={buttonClass("secondary", "sm")} href={`/${locale}/app/recycling/yard/report${q}`}>{y.report}</Link> : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={y.stock} description={y.stockLead} />
          {stock.rows.length === 0 ? <EmptyState art="workOrders" title={y.noStock} /> : (
            <Table>
              <thead><tr><Th>{d.recycling.stream}</Th><Th numeric>{y.bulkKg}</Th><Th numeric>{y.bales}</Th><Th numeric>{y.balesKg}</Th></tr></thead>
              <tbody>{stock.rows.map((r) => (
                <tr key={r.stream}><Td>{stream(r.stream)}</Td><Td numeric>{formatNumber(r.bulkKg, locale)}</Td><Td numeric>{r.bales}</Td><Td numeric>{formatNumber(r.balesKg, locale)}</Td></tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        {p.has("workorders.dispatch") ? (
          <div className="space-y-6 lg:col-span-2">
            <Card><CardHeader title={y.makeBale} description={y.makeBaleLead} /><CardBody><BaleForm yardId={yard.id} /></CardBody></Card>
            <Card><CardHeader title={y.adjustments} description={y.adjustmentsLead} /><CardBody><AdjustmentForm yardId={yard.id} /></CardBody></Card>
          </div>
        ) : null}
      </div>
      <Card className="mt-6">
        <CardHeader title={y.balesInStock} />
        {stock.bales.length === 0 ? <EmptyState art="workOrders" title={y.noBales} /> : (
          <Table scroll>
            <thead><tr><Th>{y.bale}</Th><Th>{d.recycling.stream}</Th><Th>{y.grade}</Th><Th numeric>{y.weightKg}</Th><Th>{d.common.date}</Th><Th /></tr></thead>
            <tbody>{stock.bales.map((b) => (
              <tr key={b.id}>
                <Td><Link className="num font-medium text-brand-700 hover:underline" href={`/${locale}/app/recycling/yard/bales/${b.id}`}>{b.number}</Link></Td>
                <Td>{stream(b.stream)}</Td><Td>{b.grade ?? "—"}</Td><Td numeric>{formatNumber(b.weightKg, locale)}</Td><Td>{formatDay(b.createdAt, locale)}</Td>
                <Td className="text-end">{p.has("workorders.dispatch") ? <InlineAction action={voidBaleAction} hidden={{ baleId: b.id }} label={y.breakBale} /> : null}</Td>
              </tr>
            ))}</tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
