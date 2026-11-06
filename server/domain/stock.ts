/**
 * Stock valuation at weighted average cost (coût moyen unitaire pondéré, CMUP) — the perpetual method allowed by
 * the Algerian accounting system (SCF) and the one most operators use. STOCK.md §2.
 *
 * Units: quantities in thousandths ("milli"), money in centimes ("minor"). Every movement stores its own signed value,
 * so the stock value is a plain sum and a past report never changes when later prices do.
 */

export type Balance = { qtyMilli: number; valueMinor: number };

/** "12,5" or "12.5" → 12500 milli-units. Throws on more than 3 decimals so nothing is silently rounded. */
export function toMilli(v: number): number {
  const m = Math.round(v * 1000);
  if (Math.abs(m - v * 1000) > 1e-6) throw new RangeError("tooManyDecimals");
  return m;
}

export const fromMilli = (m: number) => m / 1000;

/** Value of a receipt line: quantity × unit cost, rounded to the centime. */
export function receiptValue(qtyMilli: number, unitCostMinor: number): number {
  return Math.round((qtyMilli * unitCostMinor) / 1000);
}

/** Average unit cost in centimes (null when nothing is in stock). */
export function averageCost(b: Balance): number | null {
  return b.qtyMilli > 0 ? b.valueMinor / (b.qtyMilli / 1000) : null;
}

/**
 * Value taken out of stock for `qtyMilli` (positive) at the current average. Taking the whole balance takes the whole
 * value, so rounding never leaves a few centimes on an empty item.
 */
export function outgoingValue(b: Balance, qtyMilli: number): number {
  if (qtyMilli <= 0) throw new RangeError("quantity");
  if (qtyMilli > b.qtyMilli) throw new RangeError("insufficient");
  if (qtyMilli === b.qtyMilli) return b.valueMinor;
  return Math.round((b.valueMinor * qtyMilli) / b.qtyMilli);
}

/** True when the item should be reordered (at or below its reorder level, and a level is set). */
export function isLow(qtyMilli: number, reorderLevelMilli: number): boolean {
  return reorderLevelMilli > 0 && qtyMilli <= reorderLevelMilli;
}
