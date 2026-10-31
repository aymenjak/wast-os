"use client";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type Segment = { name: string; value: number; color: string; display: string };
export type Column = { key: string; label: string; segments: Segment[]; marker?: boolean; capLabel?: string };

/**
 * Columns per the dataviz marks spec: ≤24px wide, 4px rounded data-end, square at the baseline,
 * 2px surface gap between stacked segments, hairline solid gridlines. Each column is a focusable
 * hit target wider than the mark with a tooltip (value first, then name, keyed by a line).
 * Built in HTML flex so RTL mirrors the axis automatically.
 */
export function ColumnChart({ columns, height = 160, gridSteps = [0.5, 1], ariaLabel, showMax = false }: { columns: Column[]; height?: number; gridSteps?: number[]; ariaLabel: string; showMax?: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  const max = Math.max(1, ...columns.map((c) => c.segments.reduce((s, x) => s + x.value, 0)));
  return (
    <div className="relative" role="group" aria-label={ariaLabel}>
      <div className="relative" style={{ height }}>
        {gridSteps.map((g) => <div key={g} aria-hidden className="absolute inset-x-0 border-t border-[#e5e9e8]" style={{ bottom: `${g * 100}%` }} />)}
        <div aria-hidden className="absolute inset-x-0 bottom-0 border-t border-ink-300" />
        {showMax ? <span aria-hidden className="num absolute -top-2 end-0 bg-white ps-1 text-[11px] leading-none text-ink-600">{max}</span> : null}
        <div className="relative flex h-full items-end">
          {columns.map((c, i) => {
            const total = c.segments.reduce((s, x) => s + x.value, 0);
            const visible = c.segments.filter((x) => x.value > 0);
            return (
              <button
                key={c.key}
                type="button"
                aria-describedby={active === i ? `${id}-tip` : undefined}
                aria-label={`${c.label}: ${c.segments.map((x) => `${x.name} ${x.display}`).join(", ")}`}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className={cn("group relative flex h-full flex-1 flex-col items-center justify-end px-[2px] outline-none focus-visible:bg-ink-100/60", active === i && "bg-ink-100/50")}
              >
                {c.capLabel && total > 0 ? <span className="num mb-1 text-[11px] font-semibold text-ink-700">{c.capLabel}</span> : null}
                <span className="flex w-full max-w-6 flex-col-reverse gap-[2px]" style={{ height: `${(total / max) * 100}%` }}>
                  {visible.map((x, si) => (
                    <span key={x.name} className={cn("block w-full", si === visible.length - 1 && "rounded-t-[4px]")} style={{ flexGrow: x.value, background: x.color, minHeight: 2 }} />
                  ))}
                </span>
                {c.marker ? <span aria-hidden className="absolute -bottom-2 h-1 w-3 rounded-full" style={{ background: "#e8590c" }} /> : null}
              </button>
            );
          })}
        </div>
        {active !== null && columns[active] ? (
          <div id={`${id}-tip`} role="tooltip" className="pointer-events-none absolute top-0 z-20 min-w-36 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs shadow-[var(--shadow-pop)]"
            style={{ insetInlineStart: `min(calc(${((active + 0.5) / columns.length) * 100}% + 8px), calc(100% - 10rem))` }}>
            <div className="mb-1 text-ink-600">{columns[active].label}</div>
            {columns[active].segments.map((x) => (
              <div key={x.name} className="flex items-center gap-2">
                <span aria-hidden className="h-[2px] w-3 rounded" style={{ background: x.color }} />
                <span className="num font-semibold text-ink-950">{x.display}</span>
                <span className="text-ink-600">{x.name}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
