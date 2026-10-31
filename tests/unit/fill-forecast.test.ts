import { describe, expect, it } from "vitest";
import { forecastFill, sinceLastEmptying } from "@/server/domain/fill-forecast";

const t0 = new Date("2026-10-01T00:00:00Z").getTime();
const at = (h: number) => new Date(t0 + h * 3600_000);

describe("fill forecast", () => {
  it("extrapolates a steady 10 %/day to the threshold and to full", () => {
    const r = [0, 12, 24, 36, 48].map((h) => ({ at: at(h), fillPct: 20 + (h / 24) * 10 }));
    const f = forecastFill(r, 80, at(48))!;
    expect(f.ratePctPerDay).toBe(10);
    expect(f.thresholdAt!.toISOString()).toBe(at(24 * 6).toISOString());
    expect(f.fullAt!.toISOString()).toBe(at(24 * 8).toISOString());
  });

  it("starts from the last emptying", () => {
    const r = [{ at: at(0), fillPct: 70 }, { at: at(12), fillPct: 90 }, { at: at(24), fillPct: 5 }, { at: at(36), fillPct: 10 }, { at: at(48), fillPct: 15 }];
    expect(sinceLastEmptying(r).map((x) => x.fillPct)).toEqual([5, 10, 15]);
    expect(forecastFill(r, 80, at(48))!.ratePctPerDay).toBe(10);
  });

  it("returns null without enough signal and no date when flat", () => {
    expect(forecastFill([{ at: at(0), fillPct: 10 }, { at: at(1), fillPct: 11 }], 80)).toBeNull();
    expect(forecastFill([0, 1, 2].map((h) => ({ at: at(h), fillPct: 10 + h })), 80)).toBeNull();
    const flat = forecastFill([0, 24, 48].map((h) => ({ at: at(h), fillPct: 30 })), 80, at(48))!;
    expect([flat.thresholdAt, flat.fullAt]).toEqual([null, null]);
  });

  it("never predicts a date in the past", () => {
    const r = [0, 24, 48].map((h) => ({ at: at(h), fillPct: 50 + h }));
    const f = forecastFill(r, 80, at(24 * 10))!;
    expect(f.thresholdAt!.getTime()).toBe(at(240).getTime());
  });
});
