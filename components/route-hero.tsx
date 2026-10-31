import type { Dictionary } from "@/lib/i18n";

/*
 * Hero illustration: one collection round on a schematic street grid.
 * A single orchestrated load sequence — the route draws in, the truck follows it, and stops
 * tick over in the manifest as it passes. Reduced motion shows the final state.
 * All values are sample data and labelled as such.
 */
const PATH = "M40 236 H128 V164 H262 V78 H430 V196 H560 V112";
const POINTS: [number, number][] = [[40, 236], [128, 236], [128, 164], [262, 164], [262, 78], [430, 78], [430, 196], [560, 196], [560, 112]];
// Stops sit on the path at these points (x, y); the last is still ahead of the truck.
const STOPS: [number, number][] = [[128, 200], [196, 164], [262, 110], [360, 78], [430, 150], [560, 160]];
const TRUCK_STOP = 4; // index of the stop where the truck is now (0-based)

function lengthTo(x: number, y: number) {
  let total = 0;
  for (let i = 1; i < POINTS.length; i++) {
    const [ax, ay] = POINTS[i - 1]!, [bx, by] = POINTS[i]!;
    const onSeg = (ax === bx && x === ax && y >= Math.min(ay, by) && y <= Math.max(ay, by)) || (ay === by && y === ay && x >= Math.min(ax, bx) && x <= Math.max(ax, bx));
    if (onSeg) return total + Math.abs(x - ax) + Math.abs(y - ay);
    total += Math.abs(bx - ax) + Math.abs(by - ay);
  }
  return total;
}
const TOTAL = lengthTo(560, 112);
const DRAW_MS = 2600;

export function RouteHero({ d }: { d: Dictionary }) {
  const r = d.home.route;
  const names = [r.s1, r.s2, r.s3, r.s4, r.s5, r.s6];
  const cats = [r.c1, r.c2, r.c3, r.c1, r.c2, r.c3];
  const truckFrac = lengthTo(...STOPS[TRUCK_STOP]!) / TOTAL;
  return (
    <figure className="route-hero overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white" style={{ ["--draw" as string]: `${DRAW_MS}ms` }}>
      <figcaption className="flex items-baseline justify-between gap-3 border-b border-ink-100 px-5 py-3">
        <span className="display text-lg font-bold text-ink-900">{r.title}</span>
        <span className="text-xs text-ink-600">{r.caption}</span>
      </figcaption>
      <div className="grid lg:grid-cols-[1.35fr_1fr]">
        <div className="relative border-b border-ink-100 bg-ink-50/60 lg:border-b-0 lg:border-e" dir="ltr">
          <svg viewBox="0 0 600 280" className="block h-auto w-full" aria-hidden>
            <g stroke="#d9dfde" strokeWidth="10" strokeLinecap="round">
              {[78, 164, 236].map((y) => <line key={y} x1="10" x2="590" y1={y} y2={y} />)}
              {[128, 262, 430, 560].map((x) => <line key={x} x1={x} x2={x} y1="20" y2="270" />)}
              <line x1="340" x2="340" y1="20" y2="164" />
            </g>
            <path d={PATH} fill="none" stroke="#e8590c" strokeOpacity="0.18" strokeWidth="6" strokeLinejoin="round" />
            <path className="rh-route" d={PATH} pathLength={1} fill="none" stroke="#e8590c" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" style={{ ["--to" as string]: String(1 - truckFrac) }} />
            <g>
              <rect x="22" y="222" width="36" height="28" rx="4" fill="#1d2a2e" />
              <text x="40" y="266" textAnchor="middle" fontSize="11" fill="#4a5a5e" fontWeight="600">{r.depot}</text>
            </g>
            {STOPS.map(([x, y], i) => {
              const delay = Math.round((lengthTo(x, y) / TOTAL) * DRAW_MS);
              const done = i < TRUCK_STOP;
              return (
                <g key={i} className={done ? "rh-stop rh-stop--done" : "rh-stop"} style={{ ["--d" as string]: `${delay}ms` }}>
                  <circle cx={x} cy={y} r="11" fill="#ffffff" stroke={done ? "#1f5a44" : i === TRUCK_STOP ? "#e8590c" : "#8a9799"} strokeWidth="3" />
                  <circle className="rh-fill" cx={x} cy={y} r="8" fill="#1f5a44" />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={done ? "#ffffff" : "#1d2a2e"} className={done ? "rh-num" : undefined}>{i + 1}</text>
                </g>
              );
            })}
            <g className="rh-truck" style={{ offsetPath: `path("${PATH}")`, ["--at" as string]: `${truckFrac * 100}%` }}>
              <rect x="-13" y="-9" width="26" height="18" rx="4" fill="#1d2a2e" />
              <rect x="5" y="-6" width="6" height="12" rx="1.5" fill="#e8590c" />
            </g>
          </svg>
        </div>
        <ol className="divide-y divide-ink-100 text-sm">
          {names.map((n, i) => {
            const delay = Math.round((lengthTo(...STOPS[i]!) / TOTAL) * DRAW_MS);
            const state = i < TRUCK_STOP ? "done" : i === TRUCK_STOP ? "here" : "next";
            return (
              <li key={i} className="flex items-center gap-3 px-5 py-2.5" style={{ ["--d" as string]: `${delay}ms` }}>
                <span className="num w-4 shrink-0 text-end font-bold text-ink-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink-900">{n}</div>
                  <div className="text-xs text-ink-600">{cats[i]}</div>
                </div>
                {state === "done" ? (
                  <span className="rh-status inline-grid whitespace-nowrap text-xs font-semibold">
                    <span className="rh-before text-ink-500 [grid-area:1/1] text-end">{r.next}</span>
                    <span className="rh-after text-brand-700 [grid-area:1/1] text-end">{r.done}</span>
                  </span>
                ) : state === "here" ? (
                  <span className="whitespace-nowrap text-xs font-semibold text-[#b8460a]">{r.here}</span>
                ) : (
                  <span className="whitespace-nowrap text-xs text-ink-600">{r.next}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </figure>
  );
}
