// Real product screenshots for the public home page (synthetic seed data), per locale.
// Usage: node scripts/showcase-shots.mjs   (server on :3000 with seed data)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = "public/showcase";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const locale of ["ar", "fr", "en"]) {
  for (const mobile of [false, true]) {
    const ctx = await browser.newContext(mobile
      ? { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, reducedMotion: "reduce", locale }
      : { viewport: { width: 1360, height: 850 }, deviceScaleFactor: 1.25, reducedMotion: "reduce", locale });
    const p = await ctx.newPage();
    await p.goto(`${base}/${locale}/login`);
    await p.fill("input[name=email]", mobile ? "driver@demo-collecte.test" : "owner@demo-collecte.test");
    await p.fill("input[name=password]", "nexvo-demo-2026");
    await p.click("button[type=submit]");
    await p.waitForURL(/\/app/);
    const shot = async (path, name) => {
      await p.goto(base + path, { waitUntil: "networkidle" });
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${out}/${locale}-${name}.jpg`, type: "jpeg", quality: 78 });
    };
    if (mobile) {
      const wo = await (async () => { await p.goto(`${base}/${locale}/app/work-orders`, { waitUntil: "networkidle" }); return p.locator("a[href*='/app/work-orders/c']").first().getAttribute("href"); })();
      if (wo) await shot(wo, "field");
    } else {
      await shot(`/${locale}/app`, "dashboard");
      await shot(`/${locale}/app/iot`, "iot");
      const inv = await (async () => { await p.goto(`${base}/${locale}/app/invoices`, { waitUntil: "networkidle" }); return p.locator("a[href*='/app/invoices/c']").first().getAttribute("href"); })();
      if (inv) await shot(inv, "invoice");
    }
    await ctx.close();
  }
}
await browser.close();
console.log("done");
