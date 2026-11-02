import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatMinor, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { listSales, listYards, yardStock } from "@/server/services/yard";
import { listDestinations } from "@/server/services/recycling";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { SaleForm } from "../forms";

const TONE = { DRAFT: "neutral", DELIVERED: "info", SETTLED: "success", CANCELLED: "neutral" } as const;
const STREAMS = ["PAPER_CARDBOARD", "PET", "HDPE_PP", "PLASTIC_FILM", "MIXED_PLASTIC", "FERROUS", "ALUMINIUM", "GLASS", "ORGANIC", "WOOD", "TEXTILE", "INERT", "SPECIAL", "RESIDUAL"];

export default async function SalesPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ yard?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("invoices.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const yards = await listYards(ctx);
  const sp = await searchParams;
  const yard = yards.find((x) => x.id === sp.yard) ?? yards[0];
  const y = d.yard;
  const eyebrow = <Link href={`/${locale}/app/recycling/yard${yard ? `?yard=${yard.id}` : ""}`} className="hover:underline">{y.title}</Link>;
  if (!yard) return <><PageHeader eyebrow={eyebrow} title={y.sales} /><Card><EmptyState art="workOrders" title={y.noYard} hint={y.noYardHint} /></Card></>;
  const canWrite = ctx.permissions.has("invoices.write");
  const [sales, stock, destinations] = await Promise.all([listSales(ctx, yard.id), yardStock(ctx, yard.id), canWrite ? listDestinations(ctx, { activeOnly: true }) : Promise.resolve([])]);
  const buyers = destinations.filter((x) => !x.ownYard && ["RECYCLER", "SORTING_CENTRE", "COMPOSTING", "ANAEROBIC_DIGESTION", "REUSE_REPAIR", "ENERGY_RECOVERY"].includes(x.kind));
  const streams = STREAMS.filter((s) => stock.rows.some((r) => r.stream === s));
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={y.sales} description={y.salesLead} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {sales.length === 0 ? <EmptyState art="invoices" title={y.noSales} /> : (
            <Table scroll>
              <thead><tr><Th>{y.sale}</Th><Th>{y.buyer}</Th><Th numeric>{y.weightKg}</Th><Th numeric>{d.common.total}</Th><Th>{d.common.status}</Th></tr></thead>
              <tbody>{sales.map((s) => (
                <tr key={s.id}>
                  <Td><Link className="num font-medium text-brand-700 hover:underline" href={`/${locale}/app/recycling/yard/sales/${s.id}`}>{s.number}</Link><div className="text-xs text-ink-600">{formatDay(s.createdAt, locale)}</div></Td>
                  <Td>{s.buyer.name}</Td>
                  <Td numeric>{formatNumber(s.lines.reduce((n, l) => n + Number(l.weightKg), 0), locale)}</Td>
                  <Td numeric>{formatMinor(Number(s.totalMinor), locale)}</Td>
                  <Td><Badge tone={TONE[s.status]}>{d.enums.MaterialSaleStatus[s.status]}</Badge></Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        {canWrite ? (
          <Card className="lg:col-span-2"><CardHeader title={y.newSale} description={y.newSaleLead} /><CardBody>
            <SaleForm yardId={yard.id} buyers={buyers.map((b) => ({ id: b.id, name: b.name, registrationNumber: b.registrationNumber }))} bales={stock.bales.map((b) => ({ id: b.id, number: b.number, stream: b.stream, weightKg: b.weightKg, grade: b.grade }))} streams={streams} />
          </CardBody></Card>
        ) : null}
      </div>
    </>
  );
}
