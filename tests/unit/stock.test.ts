import { describe, expect, it } from "vitest";
import { averageCost, isLow, outgoingValue, receiptValue, toMilli } from "@/server/domain/stock";

describe("stock valuation (weighted average cost)", () => {
  it("values a receipt to the centime", () => {
    expect(receiptValue(toMilli(100), 18_000)).toBe(1_800_000); // 100 L at 180.00 DZD
    expect(receiptValue(toMilli(2.5), 33_333)).toBe(83_333); // 2.5 × 333.33 = 833.325 → 833.33
  });

  it("averages two receipts at different prices", () => {
    const b = { qtyMilli: toMilli(100) + toMilli(50), valueMinor: receiptValue(toMilli(100), 18_000) + receiptValue(toMilli(50), 21_000) };
    expect(averageCost(b)).toBe(19_000); // (18 000 + 10 500) / 150 = 190.00 DZD
  });

  it("issues at the average and empties exactly, without leftover centimes", () => {
    const b = { qtyMilli: toMilli(3), valueMinor: 1_000 }; // 3 units worth 10.00 DZD: 3.333… each
    const first = outgoingValue(b, toMilli(1));
    expect(first).toBe(333);
    const rest = { qtyMilli: toMilli(2), valueMinor: 1_000 - first };
    expect(outgoingValue(rest, toMilli(2))).toBe(667); // the last issue takes what is left
  });

  it("refuses to issue more than is on hand, or nothing", () => {
    expect(() => outgoingValue({ qtyMilli: 1000, valueMinor: 500 }, 1001)).toThrow("insufficient");
    expect(() => outgoingValue({ qtyMilli: 1000, valueMinor: 500 }, 0)).toThrow("quantity");
  });

  it("has no average when the item is empty", () => {
    expect(averageCost({ qtyMilli: 0, valueMinor: 0 })).toBeNull();
  });

  it("flags items at or below their reorder level, never when no level is set", () => {
    expect(isLow(toMilli(5), toMilli(5))).toBe(true);
    expect(isLow(toMilli(6), toMilli(5))).toBe(false);
    expect(isLow(0, 0)).toBe(false);
  });

  it("rejects more than three decimals instead of rounding silently", () => {
    expect(toMilli(1.25)).toBe(1250);
    expect(() => toMilli(1.2345)).toThrow("tooManyDecimals");
  });
});
