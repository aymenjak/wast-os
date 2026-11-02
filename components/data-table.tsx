import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

type SP = Record<string, string | string[] | undefined>;

/** Builds a query string from current params with overrides (null removes a key). */
export function withParams(sp: SP, over: Record<string, string | number | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v);
  for (const [k, v] of Object.entries(over)) (v == null || v === "" ? q.delete(k) : q.set(k, String(v)));
  const s = q.toString();
  return s ? `?${s}` : "?";
}

/** Sortable column header: a real link (works without JS), with aria-sort for screen readers. */
export function SortTh({ sp, col, label, sort, dir, d, numeric, defaultDir = "asc" }: { sp: SP; col: string; label: string; sort: string; dir: "asc" | "desc"; d: Dictionary; numeric?: boolean; defaultDir?: "asc" | "desc" }) {
  const active = sort === col;
  const nextDir = active ? (dir === "asc" ? "desc" : "asc") : defaultDir;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"} className={cn("sticky top-0 z-10 border-b border-ink-200 bg-ink-50 px-4 py-2.5 text-xs font-medium whitespace-nowrap text-ink-600", numeric ? "text-end" : "text-start")}>
      <Link href={withParams(sp, { sort: col, dir: nextDir, page: null })} className={cn("inline-flex items-center gap-1 hover:text-ink-900", active && "text-ink-900")} aria-label={d.table.sortBy.replace("{col}", label)}>
        {label}
        <Icon aria-hidden className={cn("size-3.5", active ? "text-ink-900" : "text-ink-400")} />
      </Link>
    </th>
  );
}

/** Search box, filter chips and export links in one row above the table. */
export function TableToolbar({ sp, d, locale, q, filters, active, exportKind }: { sp: SP; d: Dictionary; locale: Locale; q: string; filters?: { value: string | null; label: string }[]; active?: string | null; exportKind?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-3 py-3">
      <form role="search" className="relative w-full max-w-xs">
        {Object.entries(sp).filter(([k, v]) => typeof v === "string" && !["q", "page"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v as string} />)}
        <label htmlFor="table-q" className="sr-only">{d.table.search}</label>
        <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
        <input id="table-q" name="q" defaultValue={q} placeholder={d.table.search} className="h-9 w-full rounded-[var(--radius-control)] border border-ink-300 bg-white ps-8 pe-3 text-sm focus:border-ink-900 focus:outline-none" />
      </form>
      {filters ? (
        <nav aria-label={d.common.filter} className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <Link key={f.value ?? "all"} href={withParams(sp, { filter: f.value, page: null })} aria-current={(active ?? null) === f.value ? "page" : undefined}
              className={cn("rounded-full px-3 py-1 text-sm", (active ?? null) === f.value ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50")}>
              {f.label}
            </Link>
          ))}
        </nav>
      ) : null}
      {exportKind ? (
        <div className="ms-auto flex items-center gap-1 text-sm">
          <Download aria-hidden className="size-4 text-ink-500" />
          <span className="sr-only">{d.table.downloadAs}</span>
          <a className="rounded px-2 py-1 font-medium text-ink-800 hover:bg-ink-100" href={`/api/exports/${exportKind}?format=xlsx&locale=${locale}`}>{d.table.xlsx}</a>
          <a className="rounded px-2 py-1 font-medium text-ink-800 hover:bg-ink-100" href={`/api/exports/${exportKind}?format=csv&locale=${locale}`}>{d.table.csv}</a>
        </div>
      ) : null}
    </div>
  );
}

export function Pagination({ sp, d, locale, page, pages, total, pageSize }: { sp: SP; d: Dictionary; locale: Locale; page: number; pages: number; total: number; pageSize: number }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label={d.table.pagination} className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-sm text-ink-700">
      <span aria-live="polite">{d.table.results.replace("{from}", formatNumber(from, locale)).replace("{to}", formatNumber(to, locale)).replace("{total}", formatNumber(total, locale))}</span>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1 sm:flex">
          {d.table.perPage}
          {[25, 50, 100].map((n) => (
            <Link key={n} href={withParams(sp, { size: n, page: null })} aria-current={pageSize === n ? "true" : undefined} className={cn("rounded px-1.5", pageSize === n ? "bg-ink-900 text-white" : "hover:bg-ink-100")}>{n}</Link>
          ))}
        </span>
        <Link aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} href={withParams(sp, { page: Math.max(1, page - 1) })} className={cn("inline-flex items-center gap-1 rounded px-2 py-1", page <= 1 ? "pointer-events-none text-ink-400" : "hover:bg-ink-100")}>
          <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" />{d.table.previous}
        </Link>
        <span className="num">{page} / {pages}</span>
        <Link aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} href={withParams(sp, { page: Math.min(pages, page + 1) })} className={cn("inline-flex items-center gap-1 rounded px-2 py-1", page >= pages ? "pointer-events-none text-ink-400" : "hover:bg-ink-100")}>
          {d.table.next}<ChevronRight aria-hidden className="size-4 rtl:rotate-180" />
        </Link>
      </div>
    </nav>
  );
}
