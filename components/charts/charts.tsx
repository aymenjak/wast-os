import type { ReactNode } from "react";
import { CHART } from "./palette";

/** Ranked horizontal bars, one hue (single series): label and value in text tokens, bar beneath. */
export function RankedBars({ items }: { items: { label: string; value: number; display: string }[] }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {sorted.map((i) => (
        <li key={i.label} title={`${i.label}: ${i.display}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-800">{i.label}</span>
            <span className="num font-semibold text-ink-950">{i.display}</span>
          </div>
          <div aria-hidden className="mt-1.5 h-2.5">
            <div className="h-full rounded-e-[4px]" style={{ inlineSize: `${Math.max(1.5, (i.value / max) * 100)}%`, background: CHART.single }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A ratio against a limit: same-ramp track and fill, value as text. */
export function Meter({ value, max, label, display }: { value: number; max: number; label: ReactNode; display: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-800">{label}</span>
        <span className="num font-semibold text-ink-950">{display}</span>
      </div>
      <div role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={typeof label === "string" ? label : undefined} className="mt-1.5 h-2 rounded-full bg-[#d6e4f7]">
        <div className="h-full rounded-full" style={{ inlineSize: `${pct}%`, background: CHART.single }} />
      </div>
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-700">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: i.color }} />{i.name}</li>
      ))}
    </ul>
  );
}

/** Visible table view toggle — every charted value stays reachable without hovering. */
export function DataTableToggle({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-ink-600 hover:text-ink-900">{label}</summary>
      <div className="mt-2 overflow-x-auto">{children}</div>
    </details>
  );
}
