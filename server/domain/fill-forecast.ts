/**
 * Fill-level forecast from sensor readings: least-squares line over the readings since the last
 * emptying (a drop of 25 points or more), extrapolated to the threshold and to 100 %.
 * A transparent statistical estimate, not a black box; returns null when there is not enough signal.
 */
export type Reading = { at: Date; fillPct: number };
export type Forecast = { ratePctPerDay: number; thresholdAt: Date | null; fullAt: Date | null; basedOn: number };

const DAY = 86400_000;

export function sinceLastEmptying(readings: Reading[]): Reading[] {
  const sorted = [...readings].sort((a, b) => a.at.getTime() - b.at.getTime());
  let start = 0;
  for (let i = 1; i < sorted.length; i++) if (sorted[i - 1]!.fillPct - sorted[i]!.fillPct >= 25) start = i;
  return sorted.slice(start);
}

export function forecastFill(readings: Reading[], thresholdPct: number, now = new Date()): Forecast | null {
  const r = sinceLastEmptying(readings);
  if (r.length < 3) return null;
  const t0 = r[0]!.at.getTime();
  const xs = r.map((p) => (p.at.getTime() - t0) / DAY);
  const ys = r.map((p) => p.fillPct);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (sxx < 1e-6 || xs[n - 1]! - xs[0]! < 0.25) return null; // under ~6 hours of data
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i]! - my), 0) / sxx;
  if (slope <= 0.05) return { ratePctPerDay: Math.max(0, slope), thresholdAt: null, fullAt: null, basedOn: n };
  const intercept = my - slope * mx;
  const at = (pct: number) => {
    const d = (pct - intercept) / slope;
    const t = new Date(t0 + d * DAY);
    return t < now ? now : t;
  };
  return { ratePctPerDay: Math.round(slope * 10) / 10, thresholdAt: at(thresholdPct), fullAt: at(100), basedOn: n };
}
