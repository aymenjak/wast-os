// Money helpers. Domain code works in integer minor units (centimes) to avoid
// floating-point drift; the database stores DECIMAL(14,2).

export type Minor = number;

const MAX_SAFE_MINOR = Number.MAX_SAFE_INTEGER;

/** Parse "1234.5", "1234,50", 1234.5 or a Prisma Decimal into minor units. */
export function toMinor(value: string | number | { toString(): string }): Minor {
  const raw = typeof value === "number" ? value.toFixed(2) : value.toString();
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new RangeError(`Invalid money amount: ${raw}`);
  }
  const negative = normalized.startsWith("-");
  const [whole = "0", frac = ""] = normalized.replace("-", "").split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor > MAX_SAFE_MINOR) throw new RangeError("Amount too large");
  return negative ? -minor : minor;
}

/** Minor units → decimal string accepted by Postgres/Prisma ("1234.50"). */
export function fromMinor(minor: Minor): string {
  if (!Number.isSafeInteger(minor)) throw new RangeError("Minor amount must be an integer");
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const s = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return negative ? `-${s}` : s;
}

/** Round half away from zero, the usual commercial rounding rule. */
function roundHalfAwayFromZero(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** quantity (up to 3 decimals) × unit price (minor) → minor, rounded once. */
export function multiplyQuantity(quantity: string | number, unitPriceMinor: Minor): Minor {
  const q = typeof quantity === "number" ? quantity.toFixed(3) : quantity.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(q)) throw new RangeError(`Invalid quantity: ${quantity}`);
  const [w = "0", f = ""] = q.split(".");
  const milli = Number(w) * 1000 + Number(f.padEnd(3, "0"));
  // milli * price / 1000, computed with BigInt to stay exact before rounding.
  const product = BigInt(milli) * BigInt(unitPriceMinor);
  const whole = product / 1000n;
  const remainder = product % 1000n;
  const rounded = remainder * 2n >= 1000n ? whole + 1n : whole;
  return Number(rounded);
}

/** Tax on a line, rate in basis points (1900 = 19%). */
export function taxFor(subtotalMinor: Minor, rateBps: number): Minor {
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) throw new RangeError("Invalid tax rate");
  return roundHalfAwayFromZero((subtotalMinor * rateBps) / 10000);
}
