import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatMinor, formatNumber } from "@/lib/i18n/format";
import { appPage, orNotFound } from "@/server/page";
import { getItem } from "@/server/services/stock";
import { listVehicles } from "@/server/services/fleet";
import { orgToday } from "@/server/services/reports";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, MetricStrip, PageHeader, Stat, Table, Td, Th } from "@/components/ui/misc";
import { AdjustForm, IssueForm, ItemSettingsForm, OpeningForm } from "../forms";

export default async function StockItemPage({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const p = ctx.permissions;
  if (!p.has("fleet.read") && !p.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const { id } = await params;
  const item = await orNotFound(getItem(ctx, id));
  const s = d.stock;
  const canMove = p.has("fleet.write");
  const vehicles = canMove ? (await listVehicles(ctx)).filter((v) => v.status !== "RETIRED").map((v) => ({ id: v.id, label: `${v.plateNumber} · ${v.label}` })) : [];
  const today = orgToday(ctx);
  const u = d.enums.StockUnit[item.unit];
  const n = (m: number) => formatNumber(m / 1000, locale, 3);
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/stock`} className="hover:underline">{s.title}</Link>}
        title={item.name}
        description={<><span className="num">{item.code}</span> · {d.enums.StockCategory[item.category]}{item.active ? null : <> · <Badge>{s.inactive}</Badge></>}</>}
      />
      <MetricStrip className="mb-6">
        <Stat label={s.onHand} value={<><span className="num">{n(item.qtyMilli)}</span> <span className="text-base font-medium">{u}</span></>} tone={item.low ? "warning" : "default"} sub={item.low ? s.toReorder : undefined} />
        <Stat label={s.avgCost} value={item.avgCostMinor != null ? formatMinor(Math.round(item.avgCostMinor), locale) : "—"} sub={`/ ${u}`} />
        <Stat label={s.value} value={formatMinor(item.valueMinor, locale)} sub={s.stockValueHint} />
        <Stat label={s.reorderLevel} value={<span className="num">{n(item.reorderMilli)}</span>} />
      </MetricStrip>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={s.movements} />
          {item.movements.length === 0 ? <EmptyState art="workOrders" title={s.noMovements} /> : (
            <Table scroll>
              <thead><tr><Th>{d.common.date}</Th><Th>{s.kind}</Th><Th numeric>{s.quantity}</Th><Th numeric>{s.value}</Th><Th>{d.common.details}</Th></tr></thead>
              <tbody>{item.movements.map((m) => {
                const q = Math.round(Number(m.quantity) * 1000);
                return (
                  <tr key={m.id}>
                    <Td><bdi>{formatDay(m.occurredOn, locale)}</bdi></Td>
                    <Td>{d.enums.StockMovementKind[m.kind]}</Td>
                    <Td numeric><span className={`num ${q < 0 ? "text-danger-700" : "text-success-700"}`} dir="ltr">{q > 0 ? "+" : ""}{n(q)}</span></Td>
                    <Td numeric>{formatMinor(Number(m.valueMinor), locale)}</Td>
                    <Td>
                      {m.vehicle ? <Link className="num hover:underline" href={`/${locale}/app/fleet/${m.vehicle.id}`}>{m.vehicle.plateNumber}</Link> : null}
                      {m.purchase ? <Link className="num hover:underline" href={`/${locale}/app/stock/purchases/${m.purchase.id}`}>{m.purchase.number}</Link> : null}
                      {m.reason ? <div className="text-xs text-ink-600">{m.reason}</div> : null}
                    </Td>
                  </tr>
                );
              })}</tbody>
            </Table>
          )}
        </Card>
        {canMove ? (
          <div className="space-y-6 lg:col-span-2">
            {item.movements.length === 0 ? <Card><CardHeader title={s.opening} description={s.openingHint} /><CardBody><OpeningForm itemId={item.id} today={today} /></CardBody></Card> : null}
            <Card><CardHeader title={s.issue} description={s.issueHint} /><CardBody><IssueForm itemId={item.id} vehicles={vehicles} today={today} /></CardBody></Card>
            <Card><CardHeader title={s.adjust} description={s.adjustHint} /><CardBody><AdjustForm itemId={item.id} today={today} /></CardBody></Card>
            <Card><CardHeader title={s.settings} /><CardBody><ItemSettingsForm itemId={item.id} name={item.name} reorderLevel={String(item.reorderMilli / 1000)} notes={item.notes ?? ""} active={item.active} /></CardBody></Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
