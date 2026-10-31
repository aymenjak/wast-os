// Screens showing the "Kerbside line" illustrations (Arabic): login, 404, empty pages of a new organization.
import { chromium } from "playwright";
const base = "http://localhost:3000", out = "docs/screenshots/illustrations";
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1280, height: 820 } });
const p = await c.newPage();
const shot = async (path, name, opts = {}) => { if (path) await p.goto(base + path, { waitUntil: "networkidle" }); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${name}.png`, ...opts }); };
await shot("/ar/login", "1-login");
await p.goto(base + "/ar/this-page-does-not-exist", { waitUntil: "load" }); await shot(null, "2-not-found");
// A brand-new synthetic organization: every list is empty.
const id = Math.random().toString(36).slice(2, 8);
await p.goto(`${base}/ar/register`);
await p.locator('input[name="organizationName"]').fill(`شركة تجريبية ${id}`);
await p.locator('input[name="name"]').fill("مستخدم تجريبي");
await p.locator('input[name="email"]').fill(`ill-${id}@demo.test`);
await p.locator('input[name="password"]').fill("illustration-demo-123");
await p.locator('button[type="submit"]').click();
await p.waitForURL(/\/app/);
await shot("/ar/app/customers", "3-customers-empty");
await shot("/ar/app/iot", "4-iot-empty", { fullPage: true });
await shot("/ar/app/support", "5-support-empty");
await shot("/ar/app/invoices?q=xyz", "6-search-no-results");
await b.close();
console.log("done");
