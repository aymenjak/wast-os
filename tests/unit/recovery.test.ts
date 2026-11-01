import { describe, expect, it } from "vitest";
import { addSplits, diversionRate, EMPTY_SPLIT, splitTicket } from "@/server/domain/recovery";

const t = (o: Partial<Parameters<typeof splitTicket>[0]>) => splitTicket({ netMinor: 100000, rejectedMinor: 0, stream: "PAPER_CARDBOARD", contaminated: false, destinationKind: "RECYCLER", ...o });

describe("recovery accounting", () => {
  it("a clean recyclable load to a recycler is recovered", () => expect(t({})).toEqual({ recovered: 100000, disposed: 0, untracked: 0 }));
  it("processor rejects move from recovered to disposed and are capped at the net weight", () => {
    expect(t({ rejectedMinor: 12000 })).toEqual({ recovered: 88000, disposed: 12000, untracked: 0 });
    expect(t({ rejectedMinor: 999999 })).toEqual({ recovered: 0, disposed: 100000, untracked: 0 });
  });
  it("contaminated, residual, unclassified or landfilled loads are disposal", () => {
    for (const o of [{ contaminated: true }, { stream: "RESIDUAL" as const }, { stream: null }, { destinationKind: "LANDFILL" as const }, { destinationKind: "INCINERATION" as const }]) {
      expect(t(o)).toEqual({ recovered: 0, disposed: 100000, untracked: 0 });
    }
  });
  it("no destination = untracked, never recovered", () => expect(t({ destinationKind: null })).toEqual({ recovered: 0, disposed: 0, untracked: 100000 }));
  it("diversion rate uses everything handled in the denominator", () => {
    const s = [t({}), t({ destinationKind: "LANDFILL" }), t({ destinationKind: null }), t({ rejectedMinor: 50000 })].reduce(addSplits, EMPTY_SPLIT);
    expect(s).toEqual({ recovered: 150000, disposed: 150000, untracked: 100000 });
    expect(diversionRate(s)).toBe(0.375);
    expect(diversionRate(EMPTY_SPLIT)).toBeNull();
  });
});
