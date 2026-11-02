// Screenshots of the assistant (local demo mode: server started with AI_DEMO_PROVIDER=1 on localhost).
// Usage: node scripts/assistant-shots.mjs [outDir]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "docs/screenshots/assistant";
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const Q = {
  ar: ["ما الفواتير المتأخرة؟", "ما الحاويات التي ستمتلئ قريبًا؟", "لخّص آخر 30 يومًا"],
  fr: ["Quelles factures sont en retard ?", "Quels bacs seront bientôt pleins ?", "Qu'est-ce qui est prévu aujourd'hui ?"],
};
for (const [locale, mobile] of [["ar", false], ["fr", false], ["ar", true]]) {
  const c = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true } : { viewport: { width: 1360, height: 900 } });
  const p = await c.newPage();
  await p.goto(`${base}/${locale}/login`);
  await p.fill("input[name=email]", "owner@demo-collecte.test");
  await p.fill("input[name=password]", "nexvo-demo-2026");
  await p.click("button[type=submit]");
  await p.waitForURL(/\/app/);
  const tag = `${locale}-${mobile ? "mobile" : "desktop"}`;
  if (!mobile) {
    await p.goto(`${base}/${locale}/app/settings`, { waitUntil: "networkidle" });
    const on = p.locator("form button[type=submit]").filter({ hasText: /تفعيل المساعد|Activer l'assistant/ });
    if (await on.count()) { await on.first().click(); await p.waitForTimeout(1200); }
    const card = p.locator("section", { hasText: /المساعد الذكي|Assistant IA/ }).first();
    await card.screenshot({ path: `${out}/${tag}-1-settings.png` });
  }
  await p.goto(`${base}/${locale}/app/assistant`, { waitUntil: "networkidle" });
  await p.screenshot({ path: `${out}/${tag}-2-empty.png` });
  for (const q of Q[locale].slice(0, mobile ? 1 : 3)) {
    await p.fill("#chat-input", q);
    await p.keyboard.press("Enter");
    await p.waitForFunction((n) => document.querySelectorAll("[aria-live=polite] .whitespace-pre-wrap").length >= n, (Q[locale].indexOf(q) + 1) * 2, { timeout: 20000 });
    await p.waitForTimeout(400);
  }
  await p.screenshot({ path: `${out}/${tag}-3-conversation.png`, fullPage: true });
  await c.close();
}
await b.close();
console.log("done");
