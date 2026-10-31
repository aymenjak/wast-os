import { test, expect } from "@playwright/test";
import { register, signIn, sql, uid } from "./helpers";

/** Password reset end to end (link read from the outbox, no SMTP in tests) and assistant gating. */
test.describe.serial("password reset and assistant", () => {
  const id = uid();
  const email = `reset-${id}@e2e.test`;

  test("forgot password → link → new password → sign in", async ({ page }) => {
    await register(page, { org: `Reset Co ${id}`, email });
    await page.context().clearCookies();
    await page.goto("/en/login");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await page.waitForURL(/\/login\/forgot/);
    await page.waitForLoadState("networkidle");
    await page.locator('input[name="email"]').fill(email);
    await page.getByRole("button", { name: "Send the link" }).click();
    await expect(page.getByText(/a reset link is on its way/)).toBeVisible();
    const rows = await sql<{ text: string }>(`SELECT payload->>'text' AS text FROM "Notification" WHERE recipient = $1 AND type = 'password.reset' ORDER BY "createdAt" DESC LIMIT 1`, [email]);
    const path = rows[0]!.text.match(/\/en\/reset\/[A-Za-z0-9_-]+/)![0];
    await page.goto(path, { waitUntil: "networkidle" });
    await page.locator('input[name="password"]').fill("e2e-new-password-456");
    await page.getByRole("button", { name: "Save the new password" }).click();
    await expect(page.getByText("Password changed. Sign in with the new one.")).toBeVisible();
    await page.goto(path);
    await expect(page.getByText("This reset link is invalid or has expired.")).toBeVisible();
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("e2e-new-password-456");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/en\/app/);
  });

  test("assistant page explains when AI is not configured; no data leaves", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("e2e-new-password-456");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/en\/app/);
    await page.goto("/en/app/assistant");
    await expect(page.getByText("The AI assistant is not available on this platform yet.")).toBeVisible();
    void signIn;
  });
});
