import { test, expect } from "@playwright/test";
import { PASSWORD, register, sql, uid } from "./helpers";

/** Platform owner controls organizations; members of a suspended organization are locked out. */
test.describe.serial("platform owner console", () => {
  const id = uid();
  const tenantEmail = `tenant-${id}@e2e.test`;
  const ownerEmail = `pfowner-${id}@e2e.test`;
  const org = `Suspend Me ${id}`;

  async function signIn(page: import("@playwright/test").Page, email: string) {
    await page.context().clearCookies();
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
  }

  test("setup: a tenant and a platform owner", async ({ page }) => {
    await register(page, { org, email: tenantEmail });
    await register(page, { org: `Owner tmp ${id}`, email: ownerEmail });
    await sql(`UPDATE "User" SET "isPlatformStaff" = true, "platformRole" = 'OWNER' WHERE email = $1`, [ownerEmail]);
    await sql(`DELETE FROM "Membership" WHERE "userId" = (SELECT id FROM "User" WHERE email = $1)`, [ownerEmail]);
  });

  test("tenant users get 404 on the platform console", async ({ page }) => {
    await signIn(page, tenantEmail);
    await page.waitForURL(/\/app/);
    expect((await page.goto("/en/platform"))!.status()).toBe(404);
  });

  test("owner lands on the console, finds the organization, changes plan, suspends it", async ({ page }) => {
    await signIn(page, ownerEmail);
    await page.waitForURL(/\/en\/platform$/);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.goto("/en/platform/tenants");
    await page.locator("#table-q").fill(id);
    await page.locator("#table-q").press("Enter");
    await page.getByRole("link", { name: org }).click();
    await page.locator('select[name="planCode"]').selectOption("PRO");
    await page.locator('select[name="status"]').first().selectOption("ACTIVE");
    await page.getByRole("button", { name: "Save" }).first().click();
    await expect(page.getByText("Saved").first()).toBeVisible();
    await page.locator('input[name="reason"]').fill("Unpaid invoices (synthetic)");
    await page.getByRole("button", { name: "Suspend organization" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Unpaid invoices" })).toBeVisible();
    await expect(page.getByText("Organization suspended").first()).toBeVisible();
  });

  test("members of the suspended organization are locked out with a clear message", async ({ page }) => {
    await signIn(page, tenantEmail);
    await page.waitForURL(/suspended=1/);
    await expect(page.getByText("This workspace is suspended")).toBeVisible();
    await page.goto("/en/app/customers");
    await expect(page).toHaveURL(/suspended=1/);
  });

  test("owner reactivates; access returns", async ({ page }) => {
    await signIn(page, ownerEmail);
    await page.waitForURL(/\/platform/);
    await page.goto(`/en/platform/tenants?q=${id}`);
    await page.getByRole("link", { name: org }).click();
    await page.getByRole("button", { name: "Reactivate" }).click();
    await expect(page.getByRole("button", { name: "Suspend organization" })).toBeVisible();
    await signIn(page, tenantEmail);
    await page.waitForURL(/\/en\/app$/);
  });
});
