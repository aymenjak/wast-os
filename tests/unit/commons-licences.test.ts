import { describe, expect, it } from "vitest";
// @ts-expect-error plain ESM helper without types
import { candidates, searchUrl } from "../../scripts/lib/commons.mjs";

/** Licence filtering for downloaded website images (fixture shaped like the Commons API, formatversion=2). */
const page = (title: string, license: string, mime = "image/jpeg", width = 4000) => ({
  title,
  imageinfo: [{ mime, width, height: 3000, url: `https://upload.wikimedia.org/${title}`, thumburl: `https://upload.wikimedia.org/thumb/${title}`, thumbwidth: 1600, thumbheight: 1200, descriptionurl: `https://commons.wikimedia.org/wiki/${title}`,
    extmetadata: { LicenseShortName: { value: license }, Artist: { value: '<a href="//x">Jane <b>Doe</b></a>' }, LicenseUrl: { value: "https://creativecommons.org/licenses/by-sa/4.0" } } }],
});

describe("Commons licence filter", () => {
  it("keeps CC0 / public domain / CC BY / CC BY-SA and records attribution needs", () => {
    const out = candidates({ query: { pages: [page("File:a.jpg", "CC0"), page("File:b.jpg", "Public domain"), page("File:c.jpg", "CC BY 4.0"), page("File:d.jpg", "CC BY-SA 4.0")] } });
    expect(out.map((c: { license: string }) => c.license)).toEqual(["CC0", "Public domain", "CC BY 4.0", "CC BY-SA 4.0"]);
    expect(out.map((c: { needsAttribution: boolean }) => c.needsAttribution)).toEqual([false, false, true, true]);
    expect(out[3].shareAlike).toBe(true);
    expect(out[0].author).toBe("Jane Doe");
    expect(out[0].download).toContain("/thumb/");
  });

  it("rejects non-free, non-commercial, no-derivatives, missing licences, small images and non-photos", () => {
    const out = candidates({ query: { pages: [
      page("File:e.jpg", "CC BY-NC 4.0"), page("File:f.jpg", "CC BY-ND 4.0"), page("File:g.jpg", ""), page("File:h.jpg", "Fair use"),
      page("File:i.jpg", "CC BY 4.0", "image/jpeg", 600), page("File:j.svg", "CC0", "image/svg+xml"),
    ] } });
    expect(out).toEqual([]);
  });

  it("builds a File-namespace search with licence metadata", () => {
    const u = new URL(searchUrl("garbage truck"));
    expect(u.hostname).toBe("commons.wikimedia.org");
    expect(u.searchParams.get("gsrnamespace")).toBe("6");
    expect(u.searchParams.get("iiprop")).toContain("extmetadata");
  });
});
