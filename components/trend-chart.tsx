import type { Dictionary } from "@/lib/i18n";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";

/**
 * Stacked daily bars (completed + failed). SVG is decorative; the same numbers are in a
 * visually-hidden table for screen readers. Bars run in reading direction (mirrored in RTL).
 */
export function TrendChart({ data, d, locale }: { data: { day: string; completed: number; failed: number }[]; d: Dictionary; locale: Locale }) {
  const max = Math.max(1, ...data.map((x) => x.completed + x.failed));
  const W = 14 * data.length, H = 120;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 14}`} preserveAspectRatio="none" className="h-40 w-full rtl:-scale-x-100" aria-hidden>
        {[0.5, 1].map((f) => <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="#d9dfde" strokeWidth="0.4" />)}
        {data.map((x, i) => {
          const hc = (x.completed / max) * H, hf = (x.failed / max) * H;
          const isToday = i === data.length - 1;
          return (
            <g key={x.day}>
              <rect x={i * 14 + 2} y={H - hc} width="10" height={hc} rx="1.5" fill="#1f5a44" />
              <rect x={i * 14 + 2} y={H - hc - hf} width="10" height={hf} rx="1.5" fill="#b42318" />
              {isToday ? <rect x={i * 14 + 2} y={H + 5} width="10" height="3" rx="1.5" fill="#e8590c" /> : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex items-center gap-4 text-xs text-ink-600">
        <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-brand-700" />{d.trend.completed}</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-danger-700" />{d.trend.failed}</span>
        <span className="ms-auto">{formatDay(data[0]!.day, locale)} – {formatDay(data[data.length - 1]!.day, locale)}</span>
      </figcaption>
      <table className="sr-only">
        <caption>{d.trend.title}</caption>
        <thead><tr><th scope="col">{d.common.date}</th><th scope="col">{d.trend.completed}</th><th scope="col">{d.trend.failed}</th></tr></thead>
        <tbody>{data.map((x) => <tr key={x.day}><td>{formatDay(x.day, locale)}</td><td>{formatNumber(x.completed, locale)}</td><td>{formatNumber(x.failed, locale)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
