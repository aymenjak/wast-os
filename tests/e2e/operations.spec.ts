import { test, expect } from "@playwright/test";
import { register, uid } from "./helpers";

/** Competitor-parity features through the UI: recurring schedule, containers, command palette. */
test.describe.serial("Operations features", () => {
  const id = uid();
  const email = `ops-${id}@e2e.test`;

  test("daily contract → plan recurring collections (idempotent)", async ({ page }) => {
    await register(page, { org: `Ops ${id}`, email });
    await page.goto("/en/app/customers/new");
    await page.locator('input[name="name"]').fill("Café Méditerranée (synthetic)");
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL(/\/app\/customers\/c/);
    const customerId = page.url().split("/").pop()!;
    await page.locator('input[name="label"]').fill("Terrace");
    await page.locator('input[name="addressLine"]').fill("2 Synthetic Avenue");
    await page.locator('input[name="latitude"]').fill("35.700000");
    await page.locator('input[name="longitude"]').fill("-0.630000");
    await page.getByRole("button", { name: "Add location" }).last().click();
    await expect(page.getByText("35.7, -0.63")).toBeVisible();

    await page.goto(`/en/app/contracts/new?customer=${customerId}`);
    await page.locator('input[name="title"]').fill("Every working day");
    await page.locator('select[name="lines.0.serviceLocationId"]').selectOption({ label: "Terrace" });
    await page.locator('select[name="lines.0.frequency"]').selectOption("DAILY");
    await page.locator('input[name="lines.0.unitPrice"]').fill("1800");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL(/\/app\/contracts\/c/);
    await page.getByRole("button", { name: "Activate" }).click();
    await expect(page.getByText("Active").first()).toBeVisible();

    await page.goto("/en/app/dispatch");
    await page.getByRole("button", { name: "Plan recurring collections" }).click();
    await expect(page.getByTestId("schedule-result")).toContainText(/\d+ work orders planned, 0 already existed/);
    await page.getByRole("button", { name: "Plan recurring collections" }).click();
    await expect(page.getByTestId("schedule-result")).toContainText(/^0 work orders planned/);

    await page.goto("/en/app/fleet");
    await page.locator('input[name="name"]').fill("Crew A");
    await page.getByRole("button", { name: "New team" }).click();
    await expect(page.getByText("Crew A")).toBeVisible();
  });

  test("containers: register and deliver to a customer site", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("e2e-password-123");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app/);
    await page.goto("/en/app/containers");
    await page.locator('input[name="code"]').fill(`skp-${id}`);
    await page.locator('select[name="type"]').selectOption("SKIP_10M3");
    await page.getByRole("button", { name: "Add container" }).last().click();
    await page.getByRole("link", { name: `SKP-${id}`.toUpperCase() }).click();
    await page.getByRole("button", { name: "Deliver to customer" }).click();
    await expect(page.getByText("At customer").first()).toBeVisible();
    await expect(page.getByText("Delivered, Terrace")).toBeVisible();
  });

  test("command palette finds records accent-insensitively", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("e2e-password-123");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app/);
    // The shortcut works once the page is hydrated: press again until the palette opens.
    await expect(async () => {
      await page.keyboard.press("Control+k");
      await expect(page.getByRole("combobox")).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 15_000 });
    await page.getByRole("combobox").fill("cafe medit");
    await expect(page.getByRole("option").filter({ hasText: "Customer" }).filter({ hasText: "Café Méditerranée" })).toBeVisible();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/app\/customers\/c/);
  });
});
