import { test, expect } from "@playwright/test";
import { expectNoHorizontalOverflow, login, register, uid } from "./helpers";

/** Stock through the UI: item, supplier, purchase, issue below the reorder level (alert), refusal of overselling, Arabic phone. */
test.describe.serial("Stock & procurement", () => {
  const id = uid();
  const email = `stock-${id}@e2e.test`;

  test("purchase, issue, reorder alert and refusal to oversell", async ({ page }) => {
    await register(page, { org: `Collecte ${id}`, email });
    await page.goto("/en/app/stock");
    await expect(page.getByRole("heading", { name: "Stock", exact: true })).toBeVisible();
    await page.locator('input[name="code"]').fill(`oil-${id}`);
    await page.locator('input[name="name"]').fill("Engine oil E2E");
    await page.locator('select[name="category"]').selectOption("LUBRICANT");
    await page.locator('select[name="unit"]').selectOption("LITRE");
    await page.locator('input[name="reorderLevel"]').fill("20");
    await page.getByRole("button", { name: "Add the item" }).click();
    await expect(page.getByRole("heading", { name: "Engine oil E2E" })).toBeVisible();

    await page.goto("/en/app/stock/purchases");
    await page.locator('input[name="name"]').fill("Supplier E2E");
    await page.getByRole("button", { name: "Add the supplier" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    await page.reload();
    await page.locator('select[name="supplierId"]').selectOption({ label: "Supplier E2E" });
    await page.locator('input[name="supplierInvoiceRef"]').fill("INV-77");
    await page.locator('select[name="lines.0.itemId"]').selectOption({ label: "Engine oil E2E (L)" });
    await page.locator('input[name="lines.0.quantity"]').fill("50");
    await page.locator('input[name="lines.0.unitCost"]').fill("200");
    await page.getByRole("button", { name: "Record the purchase" }).click();
    await expect(page.getByText("To pay").first()).toBeVisible();

    await page.goto("/en/app/stock");
    await page.getByRole("link", { name: "Engine oil E2E" }).click();
    await page.locator('form:has(select[name="vehicleId"]) input[name="quantity"]').fill("35");
    await page.getByRole("button", { name: "Record" }).first().click();
    await expect(page.getByText("To reorder").first()).toBeVisible(); // 15 L left, level 20
    await page.locator('form:has(select[name="vehicleId"]) input[name="quantity"]').fill("16");
    await page.getByRole("button", { name: "Record" }).first().click();
    await expect(page.getByText("Not enough in stock.")).toBeVisible();
  });

  test("Arabic stock page fits a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, email, "ar");
    await page.goto("/ar/app/stock");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "المخزون", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
