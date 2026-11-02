import { test, expect } from "@playwright/test";
import { register, sql, uid } from "./helpers";

/** Scenario G through the UI: anonymous citizen report (Arabic, RTL) → municipal review → assignment → public tracking. */
test.describe.serial("NEXVO Civic end-to-end", () => {
  const id = uid();
  let code = "";

  test("citizen submits a report in Arabic without an account", async ({ page }) => {
    await register(page, { org: `APC E2E ${id}`, email: `muni-${id}@e2e.test`, kind: "MUNICIPALITY" });
    await sql(`UPDATE "Organization" SET "verificationStatus"='VERIFIED' WHERE name=$1`, [`APC E2E ${id}`]);
    await page.goto("/en/app/fleet");
    await page.locator('input[name="name"]').fill("Brigade 1");
    await page.getByRole("button", { name: "New team" }).click();
    await expect(page.getByText("Brigade 1")).toBeVisible();

    const citizen = await page.context().browser()!.newContext({ viewport: { width: 390, height: 844 } });
    const c = await citizen.newPage();
    await c.goto("/ar/civic/report");
    await expect(c.locator("html")).toHaveAttribute("dir", "rtl");
    await c.locator('select[name="municipality"]').selectOption({ label: `APC E2E ${id}` });
    await c.locator('textarea[name="description"]').fill("رمي عشوائي لمخلفات البناء قرب المدرسة");
    await c.locator('input[name="latitude"]').fill("36.752887");
    await c.locator('input[name="longitude"]').fill("3.042048");
    await c.getByRole("button", { name: "إرسال البلاغ" }).click();
    code = (await c.getByTestId("tracking-code").textContent())!.trim();
    expect(code).toMatch(/^NX-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    await citizen.close();
  });

  test("reviewer verifies and assigns; citizen sees progress", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator('input[name="email"]').fill(`muni-${id}@e2e.test`);
    await page.locator('input[name="password"]').fill("e2e-password-123");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/app\/civic/);
    await page.goto("/en/app/civic/queue");
    await page.getByRole("link", { name: code }).click();
    for (const to of ["UNDER_REVIEW", "VERIFIED"]) {
      await page.locator('select[name="to"]').selectOption(to);
      if (to === "VERIFIED") await page.locator('textarea[name="publicNote"]').fill("Report confirmed by our team.");
      await page.getByRole("button", { name: "Confirm" }).click();
      await expect(page.getByText(to === "VERIFIED" ? "Verified" : "Under review").first()).toBeVisible();
    }
    await page.locator('select[name="to"]').selectOption("ASSIGNED");
    await page.locator('select[name="teamId"]').selectOption({ label: "Brigade 1" });
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByRole("link", { name: /^WO-\d{5}$/ })).toBeVisible();

    const pub = await page.context().browser()!.newContext();
    const p = await pub.newPage();
    await p.goto(`/en/civic/track/${code}`);
    await expect(p.getByText("Assigned").first()).toBeVisible();
    await expect(p.getByText("Report confirmed by our team.")).toBeVisible();
    await pub.close();
  });
});
