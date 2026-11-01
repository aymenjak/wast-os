import { describe, expect, it } from "vitest";
import { addSplits, diversionRate, EMPTY_SPLIT, organicOutsideBiological, splitTicket } from "@/server/domain/recovery";

const t = (o: Partial<Parameters<typeof splitTicket>[0]>) => splitTicket({ netMinor: 100000, rejectedMinor: 0, stream: "PAPER_CARDBOARD", contaminated: false, destinationKind: "RECYCLER", ...o });

describe("recovery accounting", () => {
  it("a clean recyclable load to a recycler is recovered", () => expect(t({})).toEqual({ recovered: 100000, disposed: 0, untracked: 0, energy: 0 }));
  it("processor rejects move from recovered to disposed and are capped at the net weight", () => {
    expect(t({ rejectedMinor: 12000 })).toEqual({ recovered: 88000, disposed: 12000, untracked: 0, energy: 0 });
    expect(t({ rejectedMinor: 999999 })).toEqual({ recovered: 0, disposed: 100000, untracked: 0, energy: 0 });
  });
  it("contaminated, residual, unclassified or landfilled loads are disposal", () => {
    for (const o of [{ contaminated: true }, { stream: "RESIDUAL" as const }, { stream: null }, { destinationKind: "LANDFILL" as const }, { destinationKind: "INCINERATION" as const }]) {
      expect(t(o)).toEqual({ recovered: 0, disposed: 100000, untracked: 0, energy: 0 });
    }
  });
  it("no destination = untracked, never recovered", () => expect(t({ destinationKind: null })).toEqual({ recovered: 0, disposed: 0, untracked: 100000, energy: 0 }));
  it("diversion rate uses everything handled in the denominator", () => {
    const s = [t({}), t({ destinationKind: "LANDFILL" }), t({ destinationKind: null }), t({ rejectedMinor: 50000 })].reduce(addSplits, EMPTY_SPLIT);
    expect(s).toEqual({ recovered: 150000, disposed: 150000, untracked: 100000, energy: 0 });
    expect(diversionRate(s)).toBe(0.375);
    expect(diversionRate(EMPTY_SPLIT)).toBeNull();
  });
  // Law 01-19 as amended by law 25-02, art. 3: material valorisation includes anaerobic digestion and reuse/repair;
  // energy valorisation counts too but is reported separately; incineration without energy recovery stays disposal.
  it("anaerobic digestion and reuse/repair are material valorisation", () => {
    expect(t({ stream: "ORGANIC", destinationKind: "ANAEROBIC_DIGESTION" })).toEqual({ recovered: 100000, disposed: 0, untracked: 0, energy: 0 });
    expect(t({ stream: "TEXTILE", destinationKind: "REUSE_REPAIR" })).toEqual({ recovered: 100000, disposed: 0, untracked: 0, energy: 0 });
  });
  it("energy recovery is valorisation (even for residual waste), tracked as energy, minus rejects", () => {
    expect(t({ stream: "RESIDUAL", destinationKind: "ENERGY_RECOVERY", rejectedMinor: 10000 })).toEqual({ recovered: 90000, disposed: 10000, untracked: 0, energy: 90000 });
    expect(t({ stream: "RESIDUAL", destinationKind: "INCINERATION" })).toEqual({ recovered: 0, disposed: 100000, untracked: 0, energy: 0 });
  });
  it("flags organic waste that did not go to composting or anaerobic digestion (art. 35 bis)", () => {
    const o = (destinationKind: Parameters<typeof organicOutsideBiological>[0]["destinationKind"]) => organicOutsideBiological({ netMinor: 5000, rejectedMinor: 0, stream: "ORGANIC", contaminated: false, destinationKind });
    expect(o("LANDFILL")).toBe(5000);
    expect(o("COMPOSTING")).toBe(0);
    expect(o("ANAEROBIC_DIGESTION")).toBe(0);
    expect(o(null)).toBe(0); // untracked is reported on its own
  });
});
