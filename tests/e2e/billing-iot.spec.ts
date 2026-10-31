import { test, expect } from "@playwright/test";
import { enrollTotp, register, signIn, sql, uid } from "./helpers";

/** NEXVO subscription billing, IoT ingestion → alert, and optional 2FA for a regular user. */
test.describe.serial("billing, IoT, 2FA", () => {
  const id = uid();
  const tenantEmail = `bt-${id}@e2e.test`;
  const ownerEmail = `bo-${id}@e2e.test`;
  const org = `Billing Co ${id}`;
  let ownerSecret = "";
  let tenantSecret = "";

  test("setup", async ({ page }) => {
    await register(page, { org, email: tenantEmail });
    await register(page, { org: `Owner tmp ${id}`, email: ownerEmail });
    await sql(`UPDATE "User" SET "isPlatformStaff" = true, "platformRole" = 'OWNER' WHERE email = $1`, [ownerEmail]);
    await sql(`DELETE FROM "Membership" WHERE "userId" = (SELECT id FROM "User" WHERE email = $1)`, [ownerEmail]);
    ownerSecret = await enrollTotp(page);
  });

  test("IoT: register a fill sensor, push a reading, see the alert", async ({ page }) => {
    await signIn(page, tenantEmail);
    await page.goto("/en/app/containers");
    await page.locator('input[name="code"]').fill(`iot-${id}`);
    await page.locator('select[name="type"]').selectOption("SKIP_10M3");
    await page.getByRole("button", { name: "Add container" }).last().click();
    await expect(page.getByRole("link", { name: `IOT-${id}`.toUpperCase() })).toBeVisible();
    await page.goto("/en/app/iot");
    await page.locator('select[name="containerId"]').selectOption({ label: `IOT-${id}`.toUpperCase() });
    await page.locator('input[name="name"]').fill("Sensor A");
    await page.locator('input[name="serial"]').fill(`SN-${id}`);
    await page.getByRole("button", { name: "Register a device" }).click();
    const key = (await page.getByTestId("device-key").locator("code").textContent())!.trim();
    expect(key).toMatch(/^nxd_/);
    expect((await page.request.post("/api/iot/v1/ingest", { data: { readings: [] } })).status()).toBe(401);
    const r = await page.request.post("/api/iot/v1/ingest", { headers: { authorization: `Bearer ${key}` }, data: { readings: [{ measuredAt: new Date().toISOString(), fillPct: 88, batteryPct: 70 }] } });
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject({ accepted: 1, alerts: 1 });
    await page.reload();
    await expect(page.getByText("Bin almost full")).toBeVisible();
    await expect(page.getByText("At or above threshold now.").first()).toBeVisible();
  });

  test("owner configures billing, runs it, and the organization gets an invoice", async ({ page }) => {
    await signIn(page, ownerEmail, { secret: ownerSecret });
    await page.goto("/en/platform/billing");
    await expect(page.getByText(/Billing is off/)).toBeVisible();
    await page.locator('input[name="issuerName"]').fill("NEXVO SARL (synthetic)");
    await page.locator('input[name="issuerTaxId"]').fill("000000000000000");
    await page.getByLabel("Issue invoices automatically").check();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Saved").first()).toBeVisible();
    await sql(`UPDATE "Subscription" SET "currentPeriodEnd" = now() - interval '1 day' WHERE "organizationId" = (SELECT id FROM "Organization" WHERE name = $1)`, [org]);
    await page.getByRole("button", { name: "Run billing now" }).click();
    await expect(page.getByText("Billing run finished.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("link", { name: org })).toBeVisible();
  });

  test("the organization sees and opens its invoice; the owner records the payment", async ({ page }) => {
    await signIn(page, tenantEmail);
    await page.goto("/en/app/billing");
    const link = page.getByRole("link", { name: /^NXV-\d{4}-\d{5}$/ }).first();
    const number = (await link.textContent())!.trim();
    await link.click();
    await expect(page.getByRole("heading", { level: 1, name: "Invoice", exact: true })).toBeVisible();
    await expect(page.getByText("NIF 000000000000000")).toBeVisible();
    await signIn(page, ownerEmail, { secret: ownerSecret });
    await page.goto("/en/platform/billing?filter=ISSUED");
    const row = page.locator("tr", { hasText: number });
    await row.getByRole("button", { name: "Mark paid" }).click();
    await expect(page.locator("tr", { hasText: number })).toHaveCount(0);
    await page.goto("/en/platform/billing?filter=PAID");
    await expect(page.locator("tr", { hasText: number })).toBeVisible();
  });

  test("a regular user can turn on 2FA; sign-in then asks for the code and refuses a wrong one", async ({ page }) => {
    await signIn(page, tenantEmail);
    tenantSecret = await enrollTotp(page);
    await page.context().clearCookies();
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(tenantEmail);
    await page.locator('input[name="password"]').fill("e2e-password-123");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/login\/2fa/);
    await page.locator('input[name="code"]').fill("000000");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Wrong or expired code.")).toBeVisible();
    await signIn(page, tenantEmail, { secret: tenantSecret });
    await expect(page).toHaveURL(/\/en\/app$/);
  });
});
