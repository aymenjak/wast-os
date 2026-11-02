import { test, expect } from "@playwright/test";
import { login, register, uid } from "./helpers";

/** R3 through the UI: drop-off point + container per material, sorting campaign, territory report with a local target. */
test.describe.serial("Territory", () => {
  const id = uid();
  const email = `terr-${id}@e2e.test`;

  test("drop-off point with a container for one material", async ({ page }) => {
    await register(page, { org: `Commune ${id}`, email });
    await page.goto("/en/app/containers");
    await page.locator('input[name="code"]').fill(`pav-${id}`);
    await page.locator('select[name="type"]').selectOption("BIN_1100L");
    await page.getByRole("button", { name: "Add container" }).last().click();
    await expect(page.getByRole("link", { name: `PAV-${id}`.toUpperCase() })).toBeVisible();

    await page.goto("/en/app/recycling/drop-off");
    await page.locator('input[name="name"]').fill("PAV Market square E2E");
    await page.locator('input[name="commune"]').fill("Bir El Djir");
    await page.locator('input[name="latitude"]').fill("35.7300");
    await page.locator('input[name="longitude"]').fill("-0.5600");
    await page.getByRole("button", { name: "Add a drop-off point" }).click();
    await expect(page.getByRole("heading", { name: "PAV Market square E2E" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.locator('select[name="containerId"]').selectOption({ label: `PAV-${id}`.toUpperCase() });
    await page.locator('select[name="dropOffPointId"]').selectOption({ label: "PAV Market square E2E" });
    await page.locator('select[name="stream"]').selectOption("GLASS");
    await page.getByRole("button", { name: "Place a container" }).click();
    await expect(page.getByText(/Glass/).first()).toBeVisible();
    await expect(page.getByText("no reading")).toBeVisible();
  });

  test("sorting campaign and local target", async ({ page }) => {
    await login(page, email);
    await page.goto("/en/app/recycling/campaigns");
    await page.locator('input[name="name"]').fill("Glass campaign E2E");
    await page.locator('input[name="commune"]').fill("Bir El Djir");
    await page.locator('input[name="startsOn"]').fill(new Date().toISOString().slice(0, 10));
    await page.locator('input[name="endsOn"]').fill(new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10));
    await page.getByLabel("Glass").check();
    await page.getByRole("button", { name: "Add a campaign" }).click();
    await expect(page.getByText("Glass campaign E2E")).toBeVisible();
    await expect(page.getByText("Running")).toBeVisible();

    // Territory: no tickets yet → honest empty state, gaps shown as "—"; a local target can be set before any data.
    await page.goto("/en/app/recycling/territory");
    await expect(page.getByRole("heading", { name: "Territory" })).toBeVisible();
    await expect(page.getByText("No weight tickets in this period.")).toBeVisible();
    await page.locator('input[name="recoveryTargetPct"]').fill("35");
    await page.locator('input[name="recoveryTargetYear"]').fill("2029");
    await page.locator('input[name="recoveryTargetLabel"]').fill("Communal plan E2E");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Communal plan E2E").first()).toBeVisible();
    await expect(page.getByText(/secondary source, grade B/).first()).toBeVisible();
  });

  test("Arabic drop-off page fits a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, email, "ar");
    await page.goto("/ar/app/recycling/drop-off");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "نقاط التجميع الطوعي" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
