// Captures every screen of the system in Arabic (RTL), per role, desktop + mobile.
// Usage: node scripts/screenshots-ar.mjs [outDir]   (server on :3000 with seed data)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const out = process.argv[2] ?? "docs/screenshots/ar";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = "nexvo-demo-2026";
mkdirSync(out, { recursive: true });
const shots = []; // { file, title, section }
let n = 0;

const browser = await chromium.launch();

async function ctx(mobile = false) {
  const c = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, reducedMotion: "reduce" }
    : { viewport: { width: 1360, height: 860 }, reducedMotion: "reduce" });
  return c;
}
async function login(page, email) {
  await page.goto(`${base}/ar/login`);
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/(app|portal)/);
}
async function shot(page, path, title, section, opts = {}) {
  if (path) await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(opts.wait ?? 400);
  const slug = opts.name ?? ((path ?? "x").replace(/^\/ar\/?/, "").replace(/[^a-z0-9]+/gi, "-").replace(/-+$/, "") || "home");
  const file = `${String(++n).padStart(2, "0")}-${slug}.png`;
  await page.screenshot({ path: `${out}/${file}`, fullPage: opts.full ?? true });
  shots.push({ file, title, section });
}
async function firstHref(page, path, selector) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  return page.locator(selector).first().getAttribute("href");
}

// ── Public site ──
{
  const c = await ctx(); const p = await c.newPage();
  const S = "الموقع العام";
  await shot(p, "/ar", "الصفحة الرئيسية", S);
  await shot(p, "/ar/business", "لشركات الجمع", S);
  await shot(p, "/ar/civic", "للبلديات", S);
  await shot(p, "/ar/pricing", "الأسعار", S);
  await shot(p, "/ar/about", "من نحن والاتصال", S);
  await shot(p, "/ar/register", "إنشاء مساحة عمل", S);
  await shot(p, "/ar/login", "تسجيل الدخول", S);
  await shot(p, "/ar/civic/report", "الإبلاغ عن مشكلة (مواطن)", S);
  await shot(p, "/ar/civic/track", "متابعة بلاغ", S);
  await c.close();
}

// ── Service provider: owner ──
{
  const c = await ctx(); const p = await c.newPage();
  await login(p, "owner@demo-collecte.test");
  const S = "شركة الجمع — المالك";
  await shot(p, "/ar/app", "لوحة النظرة العامة", S);
  await p.keyboard.press("Control+k"); await p.keyboard.type("عيادة"); await p.waitForTimeout(200);
  await p.locator('[role=combobox]').fill("clinique"); await p.waitForTimeout(900);
  await shot(p, null, "البحث السريع (Ctrl+K)", S, { name: "command-palette", full: false });
  await p.keyboard.press("Escape");
  await shot(p, "/ar/app/requests?status=ALL", "طلبات الجمع", S);
  await shot(p, "/ar/app/requests/new", "طلب جمع جديد", S);
  await shot(p, "/ar/app/dispatch", "التخطيط وخريطة الجولات", S, { wait: 1200 });
  const sheet = await firstHref(p, "/ar/app/dispatch", "a[href*='/dispatch/sheet']");
  if (sheet) await shot(p, sheet, "ورقة المسار للطباعة", S, { name: "route-sheet" });
  await shot(p, "/ar/app/work-orders?status=ALL", "أوامر العمل", S);
  const wo = await firstHref(p, "/ar/app/work-orders?status=ASSIGNED", "a[href*='/app/work-orders/c']");
  if (wo) await shot(p, wo, "تفاصيل أمر عمل", S, { name: "work-order" });
  await shot(p, "/ar/app/fleet", "الأسطول والفرق", S);
  const v = await firstHref(p, "/ar/app/fleet", "a[href*='/app/fleet/c']");
  if (v) await shot(p, v, "تفاصيل مركبة وسجل الصيانة", S, { name: "vehicle" });
  await shot(p, "/ar/app/containers", "الحاويات", S);
  const ct = await firstHref(p, "/ar/app/containers", "a[href*='/app/containers/c']");
  if (ct) await shot(p, ct, "تفاصيل حاوية وتنقلاتها", S, { name: "container" });
  await shot(p, "/ar/app/customers", "الزبائن", S);
  await shot(p, "/ar/app/customers/new", "زبون جديد", S);
  const cu = await firstHref(p, "/ar/app/customers", "a[href*='/app/customers/c']");
  if (cu) await shot(p, cu, "ملف زبون", S, { name: "customer" });
  await shot(p, "/ar/app/contracts", "العقود", S);
  await shot(p, `/ar/app/contracts/new${cu ? `?customer=${cu.split("/").pop()}` : ""}`, "عقد جديد مع أيام المرور", S, { name: "contract-new" });
  const k = await firstHref(p, "/ar/app/contracts", "a[href*='/app/contracts/c']");
  if (k) await shot(p, k, "تفاصيل عقد", S, { name: "contract" });
  await shot(p, "/ar/app/invoices", "الفواتير", S);
  const inv = await firstHref(p, "/ar/app/invoices", "a[href*='/app/invoices/c']");
  if (inv) await shot(p, inv, "فاتورة مع المدفوعات", S, { name: "invoice" });
  await shot(p, `/ar/app/invoices/new${cu ? `?customer=${cu.split("/").pop()}` : ""}`, "فاتورة جديدة من الأعمال المنجزة", S, { name: "invoice-new" });
  await shot(p, "/ar/app/reports", "التقارير والتصدير", S);
  await shot(p, "/ar/app/team", "الفريق والدعوات", S);
  await shot(p, "/ar/app/settings", "الإعدادات", S);
  await c.close();
}

// ── Field worker on a phone ──
{
  const c = await ctx(true); const p = await c.newPage();
  await login(p, "driver@demo-collecte.test");
  const S = "السائق — على الهاتف";
  await shot(p, "/ar/app/work-orders", "عملي اليوم", S);
  const wo = await firstHref(p, "/ar/app/work-orders", "a[href*='/app/work-orders/c']");
  if (wo) await shot(p, wo, "أمر العمل في الميدان", S, { name: "m-work-order" });
  await p.goto(base + "/ar/app/work-orders", { waitUntil: "networkidle" });
  await p.locator("button[aria-controls=app-mobile-nav]").click();
  await shot(p, null, "القائمة على الهاتف", S, { name: "m-menu", full: false });
  await c.close();
}

// ── Customer portal ──
{
  const c = await ctx(); const p = await c.newPage();
  await login(p, "portal@demo-client.test");
  await shot(p, "/ar/portal", "بوابة الزبون", "بوابة الزبون");
  await c.close();
}

// ── Municipality ──
{
  const c = await ctx(); const p = await c.newPage();
  await login(p, "civic@demo-apc.test");
  const S = "البلدية — NEXVO المدني";
  await shot(p, "/ar/app/civic", "النظرة المدنية", S);
  await shot(p, "/ar/app/civic/queue?status=ALL", "قائمة التحقق من البلاغات", S);
  const r = await firstHref(p, "/ar/app/civic/queue?status=ALL", "a[href*='/civic/reports/']");
  if (r) await shot(p, r, "مراجعة بلاغ وقرار", S, { name: "civic-report" });
  await shot(p, "/ar/app/civic/map", "خريطة البلاغات", S, { wait: 1000 });
  await shot(p, "/ar/app/fleet", "فرق البلدية", S, { name: "civic-fleet" });
  const code = await p.evaluate(async () => null);
  void code;
  await c.close();
}

// ── Citizen tracking page (public) ──
{
  const c = await ctx(true); const p = await c.newPage();
  const S = "المواطن — على الهاتف";
  await shot(p, "/ar", "الصفحة الرئيسية على الهاتف", S, { name: "m-home" });
  await shot(p, "/ar/civic/report", "نموذج البلاغ على الهاتف", S, { name: "m-report" });
  await c.close();
}

await browser.close();
writeFileSync(`${out}/manifest.json`, JSON.stringify(shots, null, 2));
console.log(`captured ${shots.length} screens`);
