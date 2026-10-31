import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expectNoHorizontalOverflow } from "./helpers";

/** Scenario J + accessibility smoke checks (automated checks catch only part of WCAG; see TEST-PLAN.md). */
const LOCALES = [
  { l: "ar", dir: "rtl", heading: "سيّر كل عملية جمع" },
  { l: "fr", dir: "ltr", heading: "Pilotez chaque collecte" },
  { l: "en", dir: "ltr", heading: "Run every collection" },
];
const PAGES = ["", "/pricing", "/login", "/register", "/civic/report", "/civic/track"];

for (const { l, dir, heading } of LOCALES) {
  test(`${l}: direction, language and translated content`, async ({ page }) => {
    await page.goto(`/${l}`);
    await expect(page.locator("html")).toHaveAttribute("lang", l);
    await expect(page.locator("html")).toHaveAttribute("dir", dir);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  });

  test(`${l}: no serious axe violations on public pages`, async ({ page }) => {
    // Reduced motion renders the hero's final state; mid-animation crossfades would otherwise be sampled.
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const p of PAGES) {
      await page.goto(`/${l}${p}`);
      const r = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).disableRules(["region"]).exclude(".leaflet-container").analyze();
      const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${p}: ${v.id} (${v.nodes.length})`)).toEqual([]);
    }
  });

  test(`${l}: mobile layout has no horizontal overflow`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    const page = await ctx.newPage();
    for (const p of PAGES) {
      await page.goto(`/${l}${p}`);
      await expectNoHorizontalOverflow(page);
    }
    await ctx.close();
  });
}

test("unprefixed URLs negotiate a locale and authenticated pages require sign-in", async ({ request, page }) => {
  const r = await request.get("/", { maxRedirects: 0, headers: { "accept-language": "ar-DZ,ar;q=0.9" } });
  expect(r.status()).toBe(307);
  expect(r.headers()["location"]).toContain("/ar");
  await page.goto("/fr/app/customers");
  await expect(page).toHaveURL(/\/fr\/login/);
});

test("security headers are present", async ({ request }) => {
  const r = await request.get("/en");
  expect(r.headers()["x-frame-options"]).toBe("DENY");
  expect(r.headers()["x-content-type-options"]).toBe("nosniff");
  expect(r.headers()["x-powered-by"]).toBeUndefined();
});
