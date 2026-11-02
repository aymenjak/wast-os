// Wikimedia Commons helpers (pure functions, unit-tested with a fixture).
// API used: action=query, generator=search (namespace 6 = File), prop=imageinfo, iiprop=url|extmetadata|size, iiurlwidth.

/** Licences accepted for use on the public website. Anything else is skipped. */
export const ALLOWED = [/^CC0/i, /^Public domain$/i, /^PD/i, /^CC BY \d/i, /^CC BY-SA \d/i];

const strip = (html) => String(html ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export function searchUrl(query, limit = 10, width = 1600) {
  const p = new URLSearchParams({
    action: "query", format: "json", formatversion: "2", generator: "search", gsrnamespace: "6", gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: String(limit), prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: String(width), origin: "*",
  });
  return `https://commons.wikimedia.org/w/api.php?${p}`;
}

/** Turns an API response into candidates with licence metadata; keeps only allowed licences and large enough JPEG/PNG photos. */
export function candidates(json, { minWidth = 1200 } = {}) {
  const pages = json?.query?.pages ?? [];
  const out = [];
  for (const page of pages) {
    const ii = page.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata ?? {};
    const license = strip(m.LicenseShortName?.value);
    if (!ALLOWED.some((r) => r.test(license))) continue;
    if (!/^image\/(jpeg|png)$/.test(ii.mime ?? "")) continue;
    if ((ii.width ?? 0) < minWidth) continue;
    const needsAttribution = !/^(CC0|Public domain|PD)/i.test(license);
    out.push({
      title: page.title,
      author: strip(m.Artist?.value) || "Unknown",
      license,
      licenseUrl: m.LicenseUrl?.value ?? null,
      source: ii.descriptionurl,
      download: ii.thumburl ?? ii.url,
      width: ii.thumbwidth ?? ii.width,
      height: ii.thumbheight ?? ii.height,
      needsAttribution,
      shareAlike: /BY-SA/i.test(license),
    });
  }
  return out;
}
