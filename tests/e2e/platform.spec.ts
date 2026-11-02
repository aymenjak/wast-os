import { test, expect } from "@playwright/test";
import { PASSWORD, enrollTotp, register, sql, uid } from "./helpers";

/** Security headers, server-side tables, documents and remote support through the real UI. */
test("HTML responses carry a nonce-based CSP and no CSP violations on load", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text()); });
  const res = await page.goto("/ar");
  const csp = res!.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  const nonce = csp.match(/'nonce-([^']+)'/)![1];
  const second = (await (await page.request.get("/ar")).headers())["content-security-policy"];
  expect(second).not.toContain(nonce);
  await page.goto("/fr/civic/report");
  expect(violations).toEqual([]);
});

test.describe.serial("tables, certificate, remote support", () => {
  const id = uid();
  const owner = `owner-${id}@e2e.test`;
  const staff = `staff-${id}@e2e.test`;
  const subject = `Facture manquante ${id}`;

  test("customer table: search is server-side, sort is in the URL", async ({ page }) => {
    await register(page, { org: `Support Co ${id}`, email: owner });
    for (const name of ["Zeta Hôtel (synthetic)", "Alpha Café (synthetic)", "100% Bio (synthetic)"]) {
      await page.goto("/en/app/customers/new");
      await page.locator('input[name="name"]').fill(name);
      await page.getByRole("button", { name: "Create" }).click();
      await page.waitForURL(/\/app\/customers\/c/);
    }
    await page.goto("/en/app/customers");
    await page.locator("#table-q").fill("hotel");
    await page.locator("#table-q").press("Enter");
    await page.waitForURL(/q=hotel/);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody")).toContainText("Zeta Hôtel");
    await page.goto("/en/app/customers?q=%25");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.goto("/en/app/customers?sort=name&dir=desc");
    await expect(page.locator("tbody tr").first()).toContainText("Zeta");
    await expect(page.locator('th[aria-sort="descending"]')).toHaveCount(1);
    const csv = await page.request.get("/api/exports/customers?format=csv&locale=en");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("Alpha Café");
  });

  test("collection certificate renders for a customer", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(owner);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app/);
    await page.goto("/en/app/customers");
    await page.getByRole("link", { name: /Alpha Café/ }).click();
    await page.getByRole("link", { name: "Collection certificate" }).click();
    await expect(page.getByRole("heading", { name: "Collection certificate" })).toBeVisible();
    await expect(page.getByText(/Reference: ATT-/)).toBeVisible();
    await expect(page.getByText("No completed collection in this month.")).toBeVisible();
  });

  test("customer opens a ticket and grants 1 h read-only access", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(owner);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app/);
    await page.goto("/en/app/support");
    await page.locator('input[name="subject"]').fill(subject);
    await page.locator('textarea[name="body"]').fill("The October invoice is not in the list (synthetic).");
    await page.getByRole("button", { name: "Send" }).click();
    await page.waitForURL(/\/app\/support\/c/);
    await expect(page.getByRole("heading", { name: subject })).toBeVisible();
    await page.goto("/en/app/support");
    await page.locator('input[name="reason"]').fill("Look at invoice list");
    await page.getByRole("button", { name: "Allow access" }).click();
    await expect(page.getByText(/Active until/)).toBeVisible();
  });

  test("staff enters read-only, sees the banner, leaves; the customer sees it in the log", async ({ page, context }) => {
    await register(page, { org: `Staff tmp ${id}`, email: staff });
    await sql(`UPDATE "User" SET "isPlatformStaff" = true, "platformRole" = 'SUPPORT' WHERE email = $1`, [staff]);
    await sql(`DELETE FROM "Membership" WHERE "userId" = (SELECT id FROM "User" WHERE email = $1)`, [staff]);
    // Staff without two-step verification are sent to enroll first.
    await page.goto("/en/support-console");
    await page.waitForURL(/account\/security\?required=1/);
    await enrollTotp(page);
    await page.goto("/en/support-console");
    await page.getByRole("link", { name: new RegExp(subject) }).click();
    await page.getByRole("button", { name: "Open read-only view" }).click();
    await page.waitForURL(/\/en\/app$/);
    await expect(page.getByText(/NEXVO support view — read-only/)).toBeVisible();
    await page.goto("/en/app/customers");
    await expect(page.locator("tbody")).toContainText("Alpha Café");
    await expect(page.getByRole("link", { name: "New customer" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Excel" })).toHaveCount(0);
    expect((await page.request.get("/api/exports/customers?format=csv")).status()).toBe(403);
    await page.getByRole("button", { name: "Leave support view" }).click();
    await page.waitForURL(/support-console/);

    await context.clearCookies();
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(owner);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app/);
    await page.goto("/en/app/support");
    await page.getByRole("button", { name: "Revoke access" }).click();
    await expect(page.getByText("Revoked").first()).toBeVisible();
  });

  test("non-staff users get 404 on the support console", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(owner);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app/);
    const r = await page.goto("/en/support-console");
    expect(r!.status()).toBe(404);
  });
});
