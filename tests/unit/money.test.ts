import { describe, expect, it } from "vitest";
import { fromMinor, multiplyQuantity, taxFor, toMinor } from "@/lib/money";
import { applyPayment, computeLine, computeTotals, reversePayment } from "@/server/domain/invoice-math";

describe("money", () => {
  it("parses decimal strings with dot or comma", () => {
    expect(toMinor("1234.5")).toBe(123450);
    expect(toMinor("1234,50")).toBe(123450);
    expect(toMinor("0.01")).toBe(1);
    expect(toMinor(19.99)).toBe(1999);
    expect(() => toMinor("1.234")).toThrow();
    expect(() => toMinor("abc")).toThrow();
  });
  it("formats minor units", () => {
    expect(fromMinor(123450)).toBe("1234.50");
    expect(fromMinor(5)).toBe("0.05");
    expect(fromMinor(-150)).toBe("-1.50");
  });
  it("multiplies quantity exactly and rounds half up once", () => {
    expect(multiplyQuantity("2.450", 450000)).toBe(1102500);
    expect(multiplyQuantity("0.333", 100)).toBe(33);
    expect(multiplyQuantity("0.005", 100)).toBe(1); // 0.5 → 1
    expect(multiplyQuantity("3", 1999)).toBe(5997);
  });
  it("computes VAT in basis points", () => {
    expect(taxFor(1102500, 1900)).toBe(209475);
    expect(taxFor(1, 1900)).toBe(0);
    expect(taxFor(3, 1900)).toBe(1); // 0.57 → 1
    expect(() => taxFor(100, 10001)).toThrow();
  });
});

describe("invoice math", () => {
  it("totals equal the sum of lines", () => {
    const lines = [
      computeLine({ quantity: "1", unitPriceMinor: 333, taxRateBps: 1900 }),
      computeLine({ quantity: "1", unitPriceMinor: 333, taxRateBps: 1900 }),
      computeLine({ quantity: "1", unitPriceMinor: 333, taxRateBps: 900 }),
    ];
    const t = computeTotals(lines);
    expect(t.total).toBe(lines.reduce((s, l) => s + l.total, 0));
    expect(t.subtotal + t.tax).toBe(t.total);
  });
  it("applies payments and blocks overpayment / closed invoices", () => {
    expect(applyPayment("ISSUED", 10000, 0, 4000)).toEqual({ paid: 4000, status: "PARTIALLY_PAID" });
    expect(applyPayment("PARTIALLY_PAID", 10000, 4000, 6000)).toEqual({ paid: 10000, status: "PAID" });
    expect(() => applyPayment("PARTIALLY_PAID", 10000, 4000, 6001)).toThrow("errors.payment.exceedsBalance");
    expect(() => applyPayment("DRAFT", 10000, 0, 1)).toThrow("errors.payment.invoiceNotOpen");
    expect(() => applyPayment("PAID", 10000, 10000, 1)).toThrow("errors.payment.invoiceNotOpen");
    expect(() => applyPayment("ISSUED", 10000, 0, 0)).toThrow("errors.payment.invalidAmount");
  });
  it("reversal recomputes status", () => {
    expect(reversePayment(10000, 10000, 10000)).toEqual({ paid: 0, status: "ISSUED" });
    expect(reversePayment(10000, 10000, 3000)).toEqual({ paid: 7000, status: "PARTIALLY_PAID" });
  });
});
