import { test, expect } from "@playwright/test";
import { login, register, uid } from "./helpers";

/**
 * R2 sorting yard through the UI: own yard → seller → purchase voucher → bale (stock cannot go negative) → QR label →
 * sale to a recycler → delivered → mass-balance report; Arabic yard page fits a phone.
 */
test.describe.serial("Sorting yard", () => {
  const id = uid();
  const email = `yard-${id}@e2e.test`;

  test("own yard, seller, purchase voucher", async ({ page }) => {
    await register(page, { org: `Tri ${id}`, email });
    await page.goto("/en/app/recycling/destinations");
    await page.locator('input[name="name"]').fill("Our yard E2E");
    await page.locator('select[name="kind"]').selectOption("SORTING_CENTRE");
    await page.locator('input[name="ownYard"]').check();
    await page.getByRole("button", { name: "Add a destination" }).click();
    await expect(page.getByText("Our yard E2E")).toBeVisible();
    await page.locator('input[name="name"]').fill("Buyer E2E");
    await page.locator('select[name="kind"]').selectOption("RECYCLER");
    await page.getByRole("button", { name: "Add a destination" }).click();
    await expect(page.getByText("Buyer E2E")).toBeVisible();

    await page.goto("/en/app/recycling/yard/purchases");
    await page.locator('input[name="name"]').fill("Collector E2E");
    await page.getByRole("button", { name: "Add seller" }).click();
    await expect(page.getByRole("option", { name: "Collector E2E" })).toHaveCount(1);
    await page.waitForLoadState("networkidle");
    await page.locator('select[name="supplierId"]').selectOption({ label: "Collector E2E" });
    await page.locator('select[name="lines.0.stream"]').selectOption("PET");
    await page.locator('input[name="lines.0.grossKg"]').fill("110");
    await page.locator('input[name="lines.0.tareKg"]').fill("10");
    await page.locator('input[name="lines.0.unitPrice"]').fill("25");
    await page.getByRole("button", { name: "Record purchase" }).click();
    await page.waitForURL(/\/yard\/purchases\/c/);
    await expect(page.getByRole("heading", { name: /ACH-00001/ })).toBeVisible();
    await expect(page.getByText("2,500.00").first()).toBeVisible(); // 100 kg × 25.00, entered by the operator
    await page.getByRole("button", { name: "Mark as paid" }).click();
    await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  });

  test("bale within stock only, QR label, sale delivered, report", async ({ page }) => {
    await login(page, email);
    await page.goto("/en/app/recycling/yard");
    await expect(page.getByRole("cell", { name: "100" }).first()).toBeVisible();
    await page.locator('select[name="stream"]').first().selectOption("PET");
    await page.locator('input[name="weightKg"]').fill("150");
    await page.getByRole("button", { name: "Make a bale" }).last().click();
    await expect(page.getByText(/Not enough bulk stock/)).toBeVisible();
    await page.locator('input[name="weightKg"]').fill("80");
    await page.getByRole("button", { name: "Make a bale" }).last().click();
    await expect(page.getByRole("link", { name: "BAL-00001" })).toBeVisible();

    await page.getByRole("link", { name: "BAL-00001" }).click();
    await expect(page.locator('[role="img"][aria-label="QR"] svg')).toBeVisible();

    await page.goto("/en/app/recycling/yard/sales");
    await page.locator('select[name="buyerId"]').selectOption({ label: "Buyer E2E" });
    await page.getByLabel(/BAL-00001/).check();
    await page.locator('input[name="price.PET"]').fill("40");
    await page.getByRole("button", { name: "Create sale" }).click();
    await page.waitForURL(/\/yard\/sales\/c/);
    await expect(page.getByRole("heading", { name: /VTE-00001/ })).toBeVisible();
    await page.locator('input[name="buyerWeighedKg"]').fill("79");
    await page.getByRole("button", { name: "Mark delivered" }).click();
    await expect(page.getByText("Delivered", { exact: true })).toBeVisible();

    await page.goto("/en/app/recycling/yard/report");
    await expect(page.getByRole("heading", { name: /Mass balance — Our yard E2E/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: "3,200.00" }).first()).toBeVisible(); // revenue 80 × 40
  });

  test("Arabic yard page fits a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, email, "ar");
    await page.goto("/ar/app/recycling/yard");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "مركز الفرز" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
