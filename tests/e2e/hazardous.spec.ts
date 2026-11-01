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

    await page.goto("/en/app/fleet");
    await page.locator('input[name="plateNumber"]').fill(`HZ${id}-131-31`);
    await page.locator('input[name="label"]').fill("Camion DSD (synthetic)");
    await page.getByRole("button", { name: "Add vehicle" }).click();
    await expect(page.getByText(`HZ${id}-131-31`.toUpperCase())).toBeVisible();

    // Authorisation as granted (arrêté du 2 septembre 2013): wastes, vehicles, route, period.
    await page.goto("/en/app/recycling/hazardous");
    await page.getByText("Record an authorisation", { exact: true }).first().click();
    await page.locator('input[name="number"]').fill("AUT-T-E2E");
    await page.locator('input[name="validFrom"]').fill(`${new Date().getUTCFullYear()}-01-01`);
    await page.locator('input[name="validUntil"]').fill(`${new Date().getUTCFullYear() + 1}-12-31`);
    await page.locator('input[name="wasteCodes"]').fill("20.1.1");
    await page.getByLabel(`HZ${id}-131-31`.toUpperCase()).check();
    await page.locator('input[name="loadingPoint"]').fill("Garage Démo");
    await page.locator('input[name="unloadingPoint"]').fill("Installation agréée E2E");
    await page.getByRole("button", { name: "Record an authorisation" }).click();
    await expect(page.getByText("Valid", { exact: true })).toBeVisible();

    await page.locator('select[name="authorisationId"]').selectOption({ label: "AUT-T-E2E · 20.1.1" });
    await page.locator('select[name="vehicleId"]').selectOption({ label: `HZ${id}-131-31`.toUpperCase() });
    await page.locator('input[name="packageCount"]').fill("2");
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
    // Labels: one per package, model of the arrêté du 2 septembre 2013.
    await page.getByRole("link", { name: "Print labels" }).click();
    await expect(page.getByText("Déchets spéciaux dangereux *")).toHaveCount(2);
    await expect(page.getByText("DM-00001-2/2")).toBeVisible();
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
    // Treatment confirmed from the facility's certificate (décret 19-10 art. 17), D/R code from its annexes.
    await page.waitForLoadState("networkidle");
    await page.locator('select[name="treatmentCode"]').selectOption("D10");
    await page.locator('input[name="treatmentDate"]').fill(new Date().toISOString().slice(0, 10));
    await page.locator('input[name="treatmentSignedName"]').fill("Responsable installation");
    await page.getByRole("button", { name: "Confirm treatment" }).click();
    await expect(page.getByText("Treated", { exact: true })).toBeVisible();
    await expect(page.getByText("Incinération à terre")).toBeVisible();
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
