import { expect, type Page } from "@playwright/test";
import pg from "pg";

export const PASSWORD = "e2e-password-123";
export const uid = () => Math.random().toString(36).slice(2, 8);

export async function sql<T = Record<string, unknown>>(q: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(q, params)).rows as T[];
  } finally {
    await c.end();
  }
}

export async function register(page: Page, opts: { org: string; email: string; kind?: "SERVICE_PROVIDER" | "MUNICIPALITY"; locale?: string }) {
  await page.goto(`/${opts.locale ?? "en"}/register`);
  await page.getByLabel(/Company name|Nom de l'entreprise|اسم الشركة/).fill(opts.org);
  if (opts.kind) await page.locator('select[name="kind"]').selectOption(opts.kind);
  await page.locator('input[name="name"]').fill("E2E Owner");
  await page.locator('input[name="email"]').fill(opts.email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/app/);
}

export async function login(page: Page, email: string, locale = "en") {
  await page.goto(`/${locale}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(app|portal)/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** 1×1 JPEG with an EXIF segment. */
export function tinyJpeg(): Buffer {
  return Buffer.from(
    "ffd8ffe000104a46494600010100000100010000ffe1001a4578696600004750532d4c41542d33362e37ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbd3ffd9",
    "hex",
  );
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

// ── Two-step verification (same algorithm as server/auth/totp.ts) ──
import { createHmac } from "node:crypto";
function b32(s: string) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, v = 0; const out: number[] = [];
  for (const c of s.replace(/=+$/, "")) { v = (v << 5) | A.indexOf(c); bits += 5; if (bits >= 8) { out.push((v >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
export function totpNow(secret: string, step = Math.floor(Date.now() / 30000)) {
  const m = Buffer.alloc(8); m.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", b32(secret)).update(m).digest();
  const o = h[h.length - 1]! & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
const lastStep = new Map<string, number>();
/** A code for a step not used before (the server refuses replays), waiting for the next 30 s window if needed. */
export async function freshTotp(page: Page, secret: string) {
  let step = Math.floor(Date.now() / 30000);
  if ((lastStep.get(secret) ?? -1) >= step) {
    await page.waitForTimeout((step + 1) * 30000 - Date.now() + 300);
    step = Math.floor(Date.now() / 30000);
  }
  lastStep.set(secret, step);
  return totpNow(secret, step);
}

/** Enrolls the signed-in user in 2FA through the UI; returns the secret. */
export async function enrollTotp(page: Page, locale = "en") {
  await page.goto(`/${locale}/account/security`);
  await page.locator("form button[type=submit]").first().click();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.locator('input[name="code"]').fill(await freshTotp(page, secret));
  await page.locator("form:has(input[name=code]) button[type=submit]").click();
  await expect(page.getByTestId("recovery-codes")).toBeVisible();
  return secret;
}

/** Sign in, answering the second step when asked. */
export async function signIn(page: Page, email: string, opts: { secret?: string; locale?: string } = {}) {
  const locale = opts.locale ?? "en";
  await page.context().clearCookies();
  await page.goto(`/${locale}/login`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  if (opts.secret) {
    await page.waitForURL(/\/login\/2fa/);
    await page.locator('input[name="code"]').fill(await freshTotp(page, opts.secret));
    await page.locator('button[type="submit"]').click();
  }
  // Leaves the login page, or lands back on it with a reason (?suspended=1, ?no-org=1).
  await page.waitForURL((u) => !/\/login(\/2fa)?$/.test(u.pathname) || /suspended|no-org/.test(u.search));
}
