/**
 * Contract pricing terms (D-90), pure and in integer minor units.
 *
 * Tonnage tiers are graduated, per collection: the base price applies up to the first threshold, each tier's price to the
 * tonnes above its threshold (like tax brackets). A minimum charge replaces a lower amount. Weights are in centi-kg
 * (kg × 100, as stored on weight tickets), prices in minor units per tonne; the product can exceed 2^53, so BigInt.
 */
export type Tier = { aboveKg: number; unitPriceMinor: number };

export type TonnagePrice = {
  totalMinor: number;
  parts: { kgMinor: number; unitPriceMinor: number }[];
  minimumApplied: boolean;
};

/** Rounds n / d to the nearest integer, halves away from zero (n, d ≥ 0). */
function divRound(n: bigint, d: bigint) {
  return Number((n * 2n + d) / (2n * d));
}

export function tonnagePrice(kgMinor: number, baseUnitPriceMinor: number, tiers: Tier[] = [], minimumMinor: number | null = null): TonnagePrice {
  if (!Number.isInteger(kgMinor) || kgMinor < 0) throw new Error("kgMinor must be a non-negative integer");
  const sorted = [...tiers].sort((a, b) => a.aboveKg - b.aboveKg);
  const bounds = [{ fromKgMinor: 0, unitPriceMinor: baseUnitPriceMinor }, ...sorted.map((t) => ({ fromKgMinor: Math.round(t.aboveKg * 100), unitPriceMinor: t.unitPriceMinor }))];
  const parts: TonnagePrice["parts"] = [];
  let exact = 0n; // centi-kg × minor per tonne; ÷ 100 000 gives minor units
  for (let i = 0; i < bounds.length; i++) {
    const from = bounds[i]!.fromKgMinor;
    const to = i + 1 < bounds.length ? bounds[i + 1]!.fromKgMinor : Infinity;
    if (kgMinor <= from) break;
    const portion = Math.min(kgMinor, to) - from;
    if (portion <= 0) continue;
    parts.push({ kgMinor: portion, unitPriceMinor: bounds[i]!.unitPriceMinor });
    exact += BigInt(portion) * BigInt(bounds[i]!.unitPriceMinor);
  }
  const computed = divRound(exact, 100_000n);
  if (minimumMinor != null && computed < minimumMinor) return { totalMinor: minimumMinor, parts, minimumApplied: true };
  return { totalMinor: computed, parts, minimumApplied: false };
}

/** Percentage surcharge on a base, the rate in basis points (5 % = 500), rounded half up. */
export function percentOf(baseMinor: number, rateBps: number) {
  if (baseMinor <= 0 || rateBps <= 0) return 0;
  return divRound(BigInt(baseMinor) * BigInt(rateBps), 10_000n);
}

/** Tiers must have strictly increasing positive thresholds. */
export function validTiers(tiers: Tier[]) {
  return tiers.every((t, i) => t.aboveKg > 0 && t.unitPriceMinor >= 0 && (i === 0 || t.aboveKg > tiers[i - 1]!.aboveKg));
}
