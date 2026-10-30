/** Horizontal bar list: labels + values as text, bars are decorative. Logical properties keep it RTL-correct. */
export function BarList({ items, tone = "brand" }: { items: { label: string; value: number; display: string }[]; tone?: "brand" | "warning" }) {
  const max = Math.max(...items.map((i) => i.value), 0) || 1;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-800">{i.label}</span>
            <span className="num font-medium text-ink-900">{i.display}</span>
          </div>
          <div aria-hidden className="mt-1 h-2 rounded-full bg-ink-100">
            <div className={`h-2 rounded-full ${tone === "warning" ? "bg-warning-700/70" : "bg-brand-600"}`} style={{ inlineSize: `${Math.max(2, (i.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
