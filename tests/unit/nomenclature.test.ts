import { describe, expect, it } from "vitest";
import { CLASS_LETTER, findNomenclature, NOMENCLATURE_06_104 } from "@/lib/nomenclature-06-104";

// Expected values read directly from JO n° 13 of 5 March 2006 (décret exécutif 06-104), annexes II and III.
describe("décret 06-104 nomenclature", () => {
  it("has every classified rubric of annexes II (63) and III (705), each (code, class) pair once", () => {
    expect(NOMENCLATURE_06_104.filter((e) => e[1] === "MA" || e[1] === "I")).toHaveLength(63);
    expect(NOMENCLATURE_06_104.filter((e) => e[1] === "S" || e[1] === "SD")).toHaveLength(705);
    const pairs = new Set(NOMENCLATURE_06_104.map((e) => `${e[0]}|${e[1] === "MA" || e[1] === "I" ? "II" : "III"}`));
    expect(pairs.size).toBe(NOMENCLATURE_06_104.length);
    for (const e of NOMENCLATURE_06_104) expect(e[0]).toMatch(/^\d{1,2}\.\d{1,2}\.\d{1,2}$/);
  });

  it("matches rows of the official text", () => {
    expect(findNomenclature("20.1.1", "MA")?.[2]).toBe("Papier et carton");
    expect(findNomenclature("20.1.1", "SD")?.[2]).toBe("Solvants"); // same code, annex III
    expect(findNomenclature("20.3.1", "MA")?.[2]).toBe("Déchets communaux en mélange");
    expect(findNomenclature("17.1.1", "I")?.[2]).toBe("Béton");
    expect(findNomenclature("15.1.1", "MA")?.[2]).toBe("Emballages en papier/carton");
    expect(findNomenclature("20.1.21", "S")?.[2]).toBe("Métaux");
    expect(findNomenclature("9.1.2", "SD")).toBeDefined();
  });

  it("rejects a code under the wrong class and the unclassified .99 rubrics", () => {
    expect(findNomenclature("20.1.21", "MA")).toBeUndefined();
    expect(findNomenclature("17.1.1", "MA")).toBeUndefined();
    expect(findNomenclature("20.3.99", "MA")).toBeUndefined();
    expect(CLASS_LETTER.SPECIAL_HAZARDOUS).toBe("SD");
  });
});
