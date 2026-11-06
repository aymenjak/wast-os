import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { formatMinor, formatNumber } from "@/lib/i18n/format";
import { appPage } from "@/server/page";
import { listItems, STOCK_CATEGORIES } from "@/server/services/stock";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Forbidden, MetricStrip, PageHeader, Stat, Table, Td, Th } from "@/components/ui/misc";
import { StockNav } from "./sub-nav";
import { NewItemForm } from "./forms";

/** Stock of operating supplies: on hand, value at average cost, reorder alerts (STOCK.md). */
export default async function StockPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ category?: string; q?: string; low?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const p = ctx.permissions;
  if (!p.has("fleet.read") && !p.has("reports.read")) return <Forbidden message={d.errors.forbiddenPage} />;
  const sp = await searchParams;
  const s = d.stock;
  const all = await listItems(ctx);
  const category = (STOCK_CATEGORIES as readonly string[]).includes(sp.category ?? "") ? sp.category : undefined;
  const low = all.filter((r) => r.low);
  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = all.filter((r) => (!category || r.category === category) && (sp.low !== "1" || r.low) && (!q || r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)));
  const unit = (u: keyof typeof d.enums.StockUnit) => d.enums.StockUnit[u];
  const qty = (m: number, u: keyof typeof d.enums.StockUnit) => <><span className="num">{formatNumber(m / 1000, locale, 3)}</span> {unit(u)}</>;
  const filters = [{ key: "", label: d.common.all }, ...STOCK_CATEGORIES.map((c) => ({ key: c, label: d.enums.StockCategory[c] }))];
  return (
    <>
      <PageHeader title={s.title} description={s.lead} />
      <StockNav d={d} locale={locale} current="items" />
      <MetricStrip className="mb-6">
        <Stat label={s.stockValue} value={formatMinor(all.reduce((n, r) => n + r.valueMinor, 0), locale)} sub={s.stockValueHint} />
        <Stat label={s.items} value={formatNumber(all.length, locale)} />
        <Stat label={s.toReorder} value={formatNumber(low.length, locale)} tone={low.length ? "warning" : "default"} />
        <Stat label={s.recoveredNote} value={<Link className="text-base font-semibold text-brand-800 underline underline-offset-4" href={`/${locale}/app/recycling/yard`}>{s.recoveredLink}</Link>} />
      </MetricStrip>
      {low.length ? (
        <Card className="mb-6 border-warning-700/30">
          <CardHeader title={s.toReorder} description={String(low.length)} />
          <CardBody>
            <ul className="flex flex-wrap gap-2">
              {low.map((r) => (
                <li key={r.id}><Link href={`/${locale}/app/stock/${r.id}`} className="inline-flex items-center gap-2 rounded-full bg-warning-100 px-3 py-1.5 text-sm text-warning-700 hover:underline">
                  <span className="font-medium">{r.name}</span><span>{qty(r.qtyMilli, r.unit)} / {formatNumber(r.reorderMilli / 1000, locale, 3)}</span>
                </Link></li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 p-3">
            <nav aria-label={s.category} className="flex flex-wrap gap-1">
              {filters.map((f) => (
                <Link key={f.key || "all"} href={`?${new URLSearchParams({ ...(f.key ? { category: f.key } : {}), ...(sp.q ? { q: sp.q } : {}) })}`} aria-current={(category ?? "") === f.key ? "page" : undefined}
                  className={`rounded-full px-3 py-1 text-sm ${(category ?? "") === f.key ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"}`}>{f.label}</Link>
              ))}
            </nav>
            <form className="ms-auto" role="search">
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <input name="q" defaultValue={sp.q ?? ""} placeholder={d.common.search} aria-label={d.common.search} className="h-9 w-44 rounded-[var(--radius-control)] border border-ink-200 px-3 text-sm" />
            </form>
          </div>
          {rows.length === 0 ? <EmptyState art="workOrders" title={s.noItems} hint={all.length ? undefined : s.noItemsHint} /> : (
            <Table scroll>
              <thead><tr><Th>{s.item}</Th><Th>{s.category}</Th><Th numeric>{s.onHand}</Th><Th numeric>{s.avgCost}</Th><Th numeric>{s.value}</Th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <Td><Link className="font-medium text-brand-700 hover:underline" href={`/${locale}/app/stock/${r.id}`}>{r.name}</Link><div className="num text-xs text-ink-600">{r.code}</div></Td>
                  <Td>{d.enums.StockCategory[r.category]}</Td>
                  <Td numeric>{qty(r.qtyMilli, r.unit)}{r.low ? <div><Badge tone="warning">{s.toReorder}</Badge></div> : null}</Td>
                  <Td numeric>{r.avgCostMinor != null ? formatMinor(Math.round(r.avgCostMinor), locale) : "—"}</Td>
                  <Td numeric>{formatMinor(r.valueMinor, locale)}</Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </Card>
        {p.has("fleet.write") ? <Card><CardHeader title={s.newItem} /><CardBody><NewItemForm /></CardBody></Card> : null}
      </div>
    </>
  );
}
