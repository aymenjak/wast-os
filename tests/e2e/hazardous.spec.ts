import { test, expect } from "@playwright/test";
import { login, register, uid } from "./helpers";

/**
 * Special hazardous waste through the UI: transport authorisation (04-409 art. 13–16) → transport with labelled packages,
 * shipper + carrier signatures, decontamination required before the consignee signs (art. 19) → annual declaration (05-315).
 */
test.describe.serial("Hazardous waste", () => {
  const id = uid();
  const email = `hz-${id}@e2e.test`;
  let movementUrl = "";
  let customerId = "";

  test("authorisation, licensed destination, new transport", async ({ page }) => {
    await register(page, { org: `Dangereux ${id}`, email });
    await page.goto("/en/app/customers/new");
    await page.locator('input[name="name"]').fill("Garage Démo (synthetic)");
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL(/\/app\/customers\/c/);
    customerId = page.url().split("/").pop()!;

    await page.goto("/en/app/recycling/destinations");
    await page.locator('input[name="name"]').fill("Installation agréée E2E");
    await page.locator('select[name="kind"]').selectOption("INCINERATION");
    await page.locator('input[name="registrationNumber"]').fill("AUT-DSD-E2E");
    await page.getByRole("button", { name: "Add a destination" }).click();
    await expect(page.getByText("AUT-DSD-E2E")).toBeVisible();

    await page.goto("/en/app/recycling/hazardous");
    await expect(page.getByText("Not recorded")).toBeVisible();
    await page.locator('input[name="hazTransportAuthNumber"]').fill("AUT-T-E2E");
    await page.locator('input[name="hazTransportAuthExpiresOn"]').fill(`${new Date().getUTCFullYear() + 1}-12-31`);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Valid", { exact: true })).toBeVisible();

    await page.locator('select[name="customerId"]').selectOption({ label: "Garage Démo (synthetic)" });
    await page.locator('select[name="destinationId"]').selectOption({ label: "Installation agréée E2E · AUT-DSD-E2E" });
    await page.locator('input[name="wasteCode"]').fill("20.1.1");
    await page.locator('select[name="consistency"]').selectOption("LIQUID");
    await page.locator('input[name="quantityKg"]').fill("200");
    await page.locator('input[name="packaging"]').fill("Fût 200 L (synthetic)");
    await page.locator('input[name="labelled"]').check();
    await page.getByRole("button", { name: "Create transport" }).click();
    await page.waitForURL(/\/app\/recycling\/hazardous\/c/);
    movementUrl = page.url();
    await expect(page.getByRole("heading", { name: /DM-00001/ })).toBeVisible();
    await expect(page.getByText("Solvants")).toBeVisible(); // designation from décret 06-104 annex III
  });

  test("signatures in order; decontamination required before delivery", async ({ page }) => {
    await login(page, email);
    await page.goto(movementUrl);
    await page.locator('input[name="shipperSignedName"]').fill("M. Expéditeur");
    await page.getByRole("button", { name: /start transport/ }).click();
    await expect(page.getByText("In transit").first()).toBeVisible();
    await page.waitForLoadState("networkidle"); // the delivery form mounts after the refresh; let it hydrate first
    await page.locator('input[name="consigneeSignedName"]').fill("Mme Destinataire");
    // Without the decontamination confirmation (art. 19) the form does not submit — and keeps what was typed.
    await page.getByRole("button", { name: /delivered/ }).click();
    expect(await page.locator('input[name="decontaminated"]').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await expect(page.locator('input[name="consigneeSignedName"]')).toHaveValue("Mme Destinataire");
    await page.locator('input[name="decontaminated"]').check();
    await page.getByRole("button", { name: /delivered/ }).click();
    await expect(page.getByText("Delivered", { exact: true })).toBeVisible();
    await expect(page.getByText("✓ M. Expéditeur")).toBeVisible();
    await expect(page.getByText("✓ Mme Destinataire")).toBeVisible();
  });

  test("annual declaration draft and Arabic transport page on a phone", async ({ page }) => {
    await login(page, email);
    await page.goto(`/en/app/customers/${customerId}/hazardous-declaration?year=${new Date().getUTCFullYear()}`);
    await expect(page.getByRole("heading", { name: "Declaration of special hazardous waste" })).toBeVisible();
    await expect(page.getByText("DM-00001")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(movementUrl.replace("/en/", "/ar/"));
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
