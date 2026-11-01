import { test, expect } from "@playwright/test";
import { login, register, sql, uid } from "./helpers";

/**
 * Recycling R1 through the UI: destination → décret 06-104 classification (code checked against its class)
 * → weight ticket with material and destination → recovery rate → certificate. Arabic page fits a phone.
 */
test.describe.serial("Recycling", () => {
  const id = uid();
  const email = `rec-${id}@e2e.test`;
  let workOrderId = "";
  let customerId = "";

  test("setup: customer, daily contract, planned collections", async ({ page }) => {
    await register(page, { org: `Recyclage ${id}`, email });
    await page.goto("/en/app/customers/new");
    await page.locator('input[name="name"]').fill("Supérette Démo (synthetic)");
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL(/\/app\/customers\/c/);
    customerId = page.url().split("/").pop()!;
    await page.locator('input[name="label"]').fill("Store");
    await page.locator('input[name="addressLine"]').fill("3 Synthetic Road");
    await page.locator('input[name="latitude"]').fill("35.690000");
    await page.locator('input[name="longitude"]').fill("-0.620000");
    await page.getByRole("button", { name: "Add location" }).last().click();
    await expect(page.getByText("35.69, -0.62")).toBeVisible();
    await page.goto(`/en/app/contracts/new?customer=${customerId}`);
    await page.locator('input[name="title"]').fill("Daily");
    await page.locator('select[name="lines.0.serviceLocationId"]').selectOption({ label: "Store" });
    await page.locator('select[name="lines.0.frequency"]').selectOption("DAILY");
    await page.locator('input[name="lines.0.unitPrice"]').fill("1500");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL(/\/app\/contracts\/c/);
    await page.getByRole("button", { name: "Activate" }).click();
    await expect(page.getByText("Active").first()).toBeVisible();
    await page.goto("/en/app/dispatch");
    await page.getByRole("button", { name: "Plan recurring collections" }).click();
    await expect(page.getByTestId("schedule-result")).toContainText(/\d+ work orders planned/);
    // Field execution (start) is covered by business.spec; here the job is put in progress directly.
    const [wo] = await sql<{ id: string }>(
      `SELECT w.id FROM "WorkOrder" w JOIN "Organization" o ON o.id = w."organizationId" WHERE o.name = $1 ORDER BY w."scheduledDate" LIMIT 1`, [`Recyclage ${id}`]);
    workOrderId = wo!.id;
    await sql(`UPDATE "WorkOrder" SET status = 'IN_PROGRESS', "actualStart" = now() WHERE id = $1`, [workOrderId]);
  });

  test("destination and décret 06-104 classification", async ({ page }) => {
    await login(page, email);
    await page.goto("/en/app/recycling/destinations");
    await page.locator('input[name="name"]').fill("Recycleur E2E (synthetic)");
    await page.locator('select[name="kind"]').selectOption("RECYCLER");
    await page.getByRole("button", { name: "Add a destination" }).click();
    await expect(page.getByText("Recycleur E2E (synthetic)")).toBeVisible();

    const row = page.locator("li", { hasText: "Household & similar waste" });
    // 20.1.21 is "Métaux" in annex III (class S) — not a household (MA) code.
    await row.locator('input[name="nomenclatureCode"]').fill("20.1.21");
    await row.getByRole("button", { name: "Save" }).click();
    await expect(row.getByText(/does not exist in décret 06-104 for the chosen class/)).toBeVisible();
    await row.locator('input[name="nomenclatureCode"]').fill("20.3.1");
    await row.getByRole("button", { name: "Save" }).click();
    await expect(row.locator('div[lang="fr"]')).toContainText("20.3.1 MA — Déchets communaux en mélange");
  });

  test("weight ticket with material and destination feeds the rate and the certificate", async ({ page }) => {
    await login(page, email);
    await page.goto(`/en/app/work-orders/${workOrderId}`);
    await page.locator('input[name="grossKg"]').fill("10600");
    await page.locator('input[name="tareKg"]').fill("10000");
    await page.locator('select[name="stream"]').selectOption("PAPER_CARDBOARD");
    await page.locator('select[name="destinationId"]').selectOption({ label: "Recycleur E2E (synthetic) · Recycler" });
    await page.getByRole("button", { name: "Record weight" }).click();
    await expect(page.getByRole("cell", { name: "Paper & cardboard" })).toBeVisible();

    await page.goto("/en/app/recycling");
    await expect(page.getByText("100%").first()).toBeVisible();
    await page.getByRole("link", { name: "Recovery certificate" }).first().click();
    await expect(page.getByText(/VAL-/)).toBeVisible();
    await expect(page.getByText("Recycleur E2E (synthetic)").first()).toBeVisible();
  });

  test("Arabic recycling page fits a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, email, "ar");
    await page.goto("/ar/app/recycling");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "الرسكلة" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
