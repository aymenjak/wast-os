import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { buttonClass } from "@/components/ui/button";

/** Items · Purchases · Report, shared by the stock pages. */
export function StockNav({ d, locale, current }: { d: Dictionary; locale: string; current: "items" | "purchases" | "report" }) {
  const base = `/${locale}/app/stock`;
  const links = [
    { key: "items", href: base, label: d.stock.items },
    { key: "purchases", href: `${base}/purchases`, label: d.stock.purchases },
    { key: "report", href: `${base}/report`, label: d.stock.report },
  ] as const;
  return (
    <nav aria-label={d.stock.title} className="mb-6 flex flex-wrap gap-2">
      {links.map((l) => <Link key={l.key} href={l.href} aria-current={l.key === current ? "page" : undefined} className={buttonClass(l.key === current ? "primary" : "secondary", "sm")}>{l.label}</Link>)}
    </nav>
  );
}
