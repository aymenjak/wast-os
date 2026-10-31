import { describe, expect, it } from "vitest";
import { isoWeekday, serviceDates } from "@/server/domain/schedule";

const WORK = [7, 1, 2, 3, 4]; // Sun–Thu

describe("recurring schedule dates", () => {
  it("computes ISO weekdays", () => {
    expect(isoWeekday("2026-11-01")).toBe(7); // Sunday
    expect(isoWeekday("2026-11-02")).toBe(1);
  });
  it("DAILY follows working days (Fri/Sat off by default)", () => {
    const d = serviceDates({ frequency: "DAILY", weekdays: [], contractStart: "2026-01-01", contractEnd: null }, "2026-11-01", "2026-11-07", WORK);
    expect(d).toEqual(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"]);
  });
  it("WEEKLY uses selected weekdays", () => {
    const d = serviceDates({ frequency: "WEEKLY", weekdays: [1, 4], contractStart: "2026-01-01", contractEnd: null }, "2026-11-01", "2026-11-14", WORK);
    expect(d).toEqual(["2026-11-02", "2026-11-05", "2026-11-09", "2026-11-12"]);
  });
  it("WEEKLY without weekdays falls back to the contract start weekday", () => {
    const d = serviceDates({ frequency: "WEEKLY", weekdays: [], contractStart: "2026-10-06", contractEnd: null }, "2026-11-01", "2026-11-14", WORK);
    expect(d.every((x) => isoWeekday(x) === 2)).toBe(true);
    expect(d).toHaveLength(2);
  });
  it("BIWEEKLY skips alternate weeks from the contract start week", () => {
    const d = serviceDates({ frequency: "BIWEEKLY", weekdays: [1], contractStart: "2026-11-02", contractEnd: null }, "2026-11-01", "2026-11-30", WORK);
    expect(d).toEqual(["2026-11-02", "2026-11-16", "2026-11-30"]);
  });
  it("MONTHLY clamps to the last day of short months", () => {
    const d = serviceDates({ frequency: "MONTHLY", weekdays: [], contractStart: "2026-01-31", contractEnd: null }, "2026-02-01", "2026-04-30", WORK);
    expect(d).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
  });
  it("respects contract start/end and ON_DEMAND", () => {
    expect(serviceDates({ frequency: "DAILY", weekdays: [], contractStart: "2026-11-04", contractEnd: "2026-11-05" }, "2026-11-01", "2026-11-30", WORK)).toEqual(["2026-11-04", "2026-11-05"]);
    expect(serviceDates({ frequency: "ON_DEMAND", weekdays: [], contractStart: "2026-01-01", contractEnd: null }, "2026-11-01", "2026-11-30", WORK)).toEqual([]);
  });
});
