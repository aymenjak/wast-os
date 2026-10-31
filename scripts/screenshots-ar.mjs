// Captures every screen of the system in Arabic (RTL), per role, desktop + mobile.
// Usage: node scripts/screenshots-ar.mjs [outDir]   (server on :3000 with seed data)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";

// Demo staff use the PUBLIC synthetic secret from prisma/seed.ts.
const DEMO_TOTP_SECRET = "NEXVODEMOTOTPSECRETAAAAAAAAAAAAA";
function totp(secret, step = Math.floor(Date.now() / 30000)) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = 0, v = 0; const key = [];
  for (const c of secret) { v = (v << 5) | A.indexOf(c); bits += 5; if (bits >= 8) { key.push((v >>> (bits - 8)) & 255); bits -= 8; } }
  const m = Buffer.alloc(8); m.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", Buffer.from(key)).update(m).digest(); const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1000000).padStart(6, "0");
}
async function staffLogin(page, email) {
  await page.goto(`${base}/ar/login`);
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL(/\/login\/2fa/);
  await page.fill('input[name=code]', totp(DEMO_TOTP_SECRET));
  await page.click('button[type=submit]');
  await page.waitForURL(/\/(platform|support-console)/);
}

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
  if (cu) await shot(p, `${cu}/certificate`, "شهادة جمع شهرية (للطباعة)", S, { name: "certificate" });
  await shot(p, "/ar/app/iot", "المستشعرات وأجهزة التتبع: تنبيهات وتوقّع الامتلاء", S, { name: "iot" });
  const ctIot = await firstHref(p, "/ar/app/iot", "a[href*='/app/containers/c']");
  if (ctIot) await shot(p, ctIot, "حاوية بمستشعر: القراءات والتوقّع", S, { name: "container-iot" });
  await shot(p, "/ar/app/billing", "اشتراك المؤسسة وفواتير NEXVO", S, { name: "billing" });
  await shot(p, "/ar/app/customers?sort=name&dir=asc&q=", "جدول الزبائن: بحث وفرز وتصدير Excel", S, { name: "customers-table", full: false });
  // Support: open a request and grant 1 h read-only access (synthetic data).
  await p.goto(base + "/ar/app/support", { waitUntil: "networkidle" });
  await p.fill('input[name=subject]', "فاتورة أكتوبر لا تظهر (مثال)");
  await p.fill('textarea[name=body]', "لا أجد فاتورة شهر أكتوبر في القائمة. (بيانات تجريبية)");
  await p.locator("form:has(textarea[name=body]) button[type=submit]").first().click();
  await p.waitForURL(/\/app\/support\/c/);
  await shot(p, null, "طلب دعم ومحادثة", S, { name: "support-ticket" });
  await p.goto(base + "/ar/app/support", { waitUntil: "networkidle" });
  await p.fill('input[name=reason]', "مراجعة قائمة الفواتير");
  await p.locator("form:has(input[name=reason]) button[type=submit]").click();
  await p.waitForTimeout(800);
  await shot(p, "/ar/app/support", "الدعم: طلبات، وإذن وصول مؤقت وسجل الدخول", S, { name: "support" });
  await c.close();
}

// ── Platform owner ──
{
  const c = await ctx(); const p = await c.newPage();
  await staffLogin(p, "admin@nexvo.test");
  const S = "مالك المنصة";
  await shot(p, null, "التحقق بخطوتين مفعّل لفريق المنصة", S, { name: "platform-login-ok", full: false });
  await shot(p, "/ar/platform", "لوحة مالك المنصة", S, { name: "platform" });
  await shot(p, "/ar/platform/tenants", "كل المؤسسات: بحث وفلاتر", S, { name: "platform-tenants" });
  const t = await firstHref(p, "/ar/platform/tenants", "a[href*='/platform/tenants/c']");
  if (t) await shot(p, t, "مؤسسة: الاشتراك والأعضاء والإيقاف", S, { name: "platform-tenant" });
  await shot(p, "/ar/platform/plans", "الباقات والأسعار والحدود", S, { name: "platform-plans" });
  await shot(p, "/ar/platform/billing", "فوترة اشتراكات NEXVO", S, { name: "platform-billing" });
  await shot(p, "/ar/account/security", "أمان الحساب: التحقق بخطوتين", S, { name: "account-security" });
  await shot(p, "/ar/platform/staff?q=demo", "فريق المنصة والحسابات", S, { name: "platform-staff" });
  await shot(p, "/ar/platform/audit", "سجل التدقيق", S, { name: "platform-audit" });
  await c.close();
}

// ── NEXVO support staff ──
{
  const c = await ctx(); const p = await c.newPage();
  await new Promise((r) => setTimeout(r, 31000 - (Date.now() % 30000))); // next TOTP window (codes are single-use per user anyway)
  await staffLogin(p, "support@nexvo.test");
  const S = "فريق دعم NEXVO";
  await shot(p, "/ar/support-console", "لوحة الدعم", S, { name: "support-console" });
  const t = await firstHref(p, "/ar/support-console", "a[href*='/support-console/c']");
  if (t) {
    await shot(p, t, "طلب من زبون مع إذن الوصول", S, { name: "support-console-ticket" });
    await p.locator("form button[type=submit]").filter({ hasText: /عرض|فتح/ }).first().click();
    await p.waitForURL(/\/ar\/app$/);
    await shot(p, null, "عرض الدعم للقراءة فقط (شريط واضح)", S, { name: "support-view", full: false });
  }
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
  await shot(p, "/ar/portal/certificate", "شهادة الجمع للزبون", "بوابة الزبون", { name: "portal-certificate" });
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
