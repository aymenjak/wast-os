// Captures representative screens for design review. Usage: node scripts/screenshots.mjs [outDir]
import { chromium } from "playwright";
const out = process.argv[2] ?? "docs/screenshots";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
async function shoot(page, path, name, opts = {}) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: opts.full ?? false });
}
const desktop = await browser.newContext({ viewport: { width: 1360, height: 860 } });
const p = await desktop.newPage();
await shoot(p, "/fr", "public-home-fr", { full: true });
await shoot(p, "/ar", "public-home-ar");
await shoot(p, "/en/pricing", "public-pricing-en");
await shoot(p, "/ar/civic/report", "civic-report-ar", { full: true });
await p.goto(base + "/fr/login");
await p.fill('input[name=email]', "owner@demo-collecte.test");
await p.fill('input[name=password]', "nexvo-demo-2026");
await p.click('button[type=submit]');
await p.waitForURL("**/app");
await shoot(p, "/fr/app", "app-dashboard-fr", { full: true });
await shoot(p, "/ar/app/dispatch", "app-dispatch-ar", { full: true });
await shoot(p, "/en/app/customers", "app-customers-en");
await shoot(p, "/ar/app/requests?status=ALL", "app-requests-ar");
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
const m = await mobile.newPage();
await m.goto(base + "/ar/login");
await m.fill('input[name=email]', "driver@demo-collecte.test");
await m.fill('input[name=password]', "nexvo-demo-2026");
await m.click('button[type=submit]');
await m.waitForURL("**/app/work-orders");
await shoot(m, "/ar/app/work-orders", "mobile-field-ar");
const first = await m.locator("a[href*='/app/work-orders/']").first().getAttribute("href");
if (first) await shoot(m, first, "mobile-workorder-ar", { full: true });
await browser.close();
console.log("ok");
