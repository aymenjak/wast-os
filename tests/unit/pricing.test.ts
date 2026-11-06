import { describe, expect, it } from "vitest";
import { percentOf, tonnagePrice, validTiers } from "@/server/domain/pricing";

/** Contract pricing terms (D-90): graduated tonnage tiers, minimum charge, percentage surcharges. */
describe("tonnage pricing", () => {
  it("without tiers: net tonnes × price, rounded to the centime", () => {
    // 1 234.56 kg at 4 500,00 DA/t = 5 555,52 DA
    expect(tonnagePrice(123_456, 450_000).totalMinor).toBe(555_552);
  });

  it("graduated tiers: each portion at its own price", () => {
    // 0–2 t at 4 500, 2–5 t at 4 000, above 5 t at 3 500; 6.5 t → 9 000 + 12 000 + 5 250 = 26 250 DA
    const r = tonnagePrice(650_000, 450_000, [{ aboveKg: 2000, unitPriceMinor: 400_000 }, { aboveKg: 5000, unitPriceMinor: 350_000 }]);
    expect(r.parts).toEqual([{ kgMinor: 200_000, unitPriceMinor: 450_000 }, { kgMinor: 300_000, unitPriceMinor: 400_000 }, { kgMinor: 150_000, unitPriceMinor: 350_000 }]);
    expect(r.totalMinor).toBe(2_625_000);
  });

  it("a weight below the first threshold uses the base price only; tier order does not matter", () => {
    const r = tonnagePrice(150_000, 450_000, [{ aboveKg: 5000, unitPriceMinor: 350_000 }, { aboveKg: 2000, unitPriceMinor: 400_000 }]);
    expect([r.parts.length, r.totalMinor]).toEqual([1, 675_000]);
  });

  it("minimum charge replaces a lower amount, not a higher one", () => {
    expect(tonnagePrice(10_000, 450_000, [], 200_000)).toMatchObject({ totalMinor: 200_000, minimumApplied: true }); // 100 kg = 450 DA < 2 000
    expect(tonnagePrice(100_000, 450_000, [], 200_000)).toMatchObject({ totalMinor: 450_000, minimumApplied: false });
  });

  it("large weights and prices do not lose precision", () => {
    // 100 t at 99 999 999,99 DA/t
    expect(tonnagePrice(10_000_000, 9_999_999_999).totalMinor).toBe(999_999_999_900);
  });

  it("percent surcharge rounds half up; zero base or rate gives nothing", () => {
    expect(percentOf(1_000_005, 500)).toBe(50_000); // 50 000.25 → 50 000
    expect(percentOf(1_000_010, 500)).toBe(50_001); // 50 000.5 → 50 001
    expect(percentOf(0, 500)).toBe(0);
  });

  it("tiers need strictly increasing positive thresholds", () => {
    expect(validTiers([{ aboveKg: 1000, unitPriceMinor: 1 }, { aboveKg: 2000, unitPriceMinor: 1 }])).toBe(true);
    expect(validTiers([{ aboveKg: 2000, unitPriceMinor: 1 }, { aboveKg: 2000, unitPriceMinor: 1 }])).toBe(false);
    expect(validTiers([{ aboveKg: 0, unitPriceMinor: 1 }])).toBe(false);
  });
});
