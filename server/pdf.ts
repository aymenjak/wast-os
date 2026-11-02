import "server-only";
import type { Browser } from "playwright-core";

/**
 * HTML → PDF with headless Chromium (correct Arabic shaping and RTL, same layout as the print view).
 * Optional: enabled only when CHROMIUM_PATH points to a Chromium/Chrome binary. Rendering is offline:
 * JavaScript is disabled and every network request is blocked, so untrusted text in an invoice cannot fetch anything.
 */
let browser: Promise<Browser> | null = null;

export function pdfEnabled() {
  return !!process.env.CHROMIUM_PATH;
}

async function getBrowser() {
  if (!browser) {
    const { chromium } = await import("playwright-core");
    browser = chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--headless", "--no-sandbox", "--disable-gpu"] });
    browser.catch(() => { browser = null; });
  }
  return browser;
}

export async function htmlToPdf(html: string): Promise<Buffer> {
  if (!pdfEnabled()) throw new Error("PDF rendering is not configured (CHROMIUM_PATH)");
  const b = await getBrowser();
  const ctx = await b.newContext({ javaScriptEnabled: false });
  try {
    await ctx.route("**/*", (r) => (r.request().url().startsWith("data:") ? r.continue() : r.abort()));
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 15_000 });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" } }));
  } finally {
    await ctx.close();
  }
}
