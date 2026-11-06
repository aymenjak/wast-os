import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { expectNoHorizontalOverflow, login, register, sql, tinyJpeg, uid } from "./helpers";

/**
 * Offline driver app (D-77) in a real browser: the page and the jobs open with the network cut, a whole job is
 * done offline (start, photo, weight, finish), and it reaches the server once the network is back — exactly once.
 */
test.describe.serial("Offline driver mode", () => {
  const id = uid();
  const email = `drv-${id}@e2e.test`;
  let woId = "";
  const number = `WO-OFF-${id}`.toUpperCase();

  test("set up a driver with one assigned job", async ({ page }) => {
    await register(page, { org: `Transport ${id}`, email });
    const [m] = await sql<{ id: string; organizationId: string; userId: string }>(
      `SELECT m.id, m."organizationId", m."userId" FROM "Membership" m JOIN "User" u ON u.id = m."userId" WHERE u.email = $1`, [email]);
    const org = m!.organizationId;
    const team = randomUUID(), vehicle = randomUUID(), customer = randomUUID(), location = randomUUID();
    woId = randomUUID();
    await sql(`INSERT INTO "Team"(id, "organizationId", name) VALUES ($1, $2, 'Equipe E2E')`, [team, org]);
    await sql(`INSERT INTO "TeamMember"("teamId", "membershipId") VALUES ($1, $2)`, [team, m!.id]);
    await sql(`INSERT INTO "Vehicle"(id, "organizationId", "plateNumber", label) VALUES ($1, $2, '01234-116-31', 'Benne E2E')`, [vehicle, org]);
    await sql(`INSERT INTO "Customer"(id, "organizationId", code, name, "updatedAt") VALUES ($1, $2, $3, 'Marché couvert (synthetic)', now())`, [customer, org, `C-${id}`]);
    await sql(`INSERT INTO "ServiceLocation"(id, "organizationId", "customerId", label, "addressLine", commune) VALUES ($1, $2, $3, 'Entrée', 'Rue des Oliviers', 'Es Senia')`, [location, org, customer]);
    await sql(
      `INSERT INTO "WorkOrder"(id, "organizationId", number, kind, status, "customerId", "serviceLocationId", "teamId", "vehicleId", "scheduledDate", "createdById", "updatedAt")
       VALUES ($1, $2, $3, 'COLLECTION', 'ASSIGNED', $4, $5, $6, $7, (now() AT TIME ZONE 'Africa/Algiers')::date, $8, now())`,
      [woId, org, number, customer, location, team, vehicle, m!.userId]);
    await sql(`UPDATE "Membership" SET role = 'FIELD_WORKER' WHERE id = $1`, [m!.id]);
  });

  test("a whole job done offline is sent once when the network returns", async ({ page, context }) => {
    await login(page, email);
    await page.goto("/en/app/work-orders");
    await page.getByRole("link", { name: "Offline mode" }).click();
    await expect(page).toHaveURL(/\/en\/field$/);
    await expect(page.getByText("Marché couvert (synthetic)")).toBeVisible();
    // Let the service worker install and keep this page, then reload once under its control.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await expect(page.getByText("Marché couvert (synthetic)")).toBeVisible();
    await page.waitForLoadState("networkidle");

    await context.setOffline(true);
    await page.reload(); // served by the service worker, jobs from IndexedDB
    await expect(page.getByTestId("net-status")).toHaveText(/Offline/);
    await page.getByRole("button", { name: /Marché couvert/ }).click();
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByTestId("pending")).toHaveText("1 waiting to send");
    await page.getByTestId("photo-input").setInputFiles({ name: "proof.jpg", mimeType: "image/jpeg", buffer: tinyJpeg() });
    await expect(page.getByTestId("photo-count")).toHaveText("Photos: 1");
    await page.locator('input[name="grossKg"]').fill("1250");
    await page.locator('input[name="tareKg"]').fill("250");
    await page.getByRole("button", { name: "Save the weight" }).click();
    // Customer signature on the collection slip, drawn with the network still cut.
    await page.getByTestId("sign-open").click();
    await page.locator('input[name="signerName"]').fill("Gardien du marché (synthetic)");
    const pad = (await page.getByTestId("signature-pad").boundingBox())!;
    await page.mouse.move(pad.x + 20, pad.y + pad.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(pad.x + 20 + i * 20, pad.y + pad.height / 2 + (i % 2 ? 15 : -15));
    await page.mouse.up();
    await page.getByRole("button", { name: "Save the signature" }).click();
    await expect(page.getByTestId("signed")).toBeVisible();
    await page.getByRole("button", { name: "Finish the job" }).click();
    await expect(page.getByTestId("pending")).toHaveText("5 waiting to send");
    await expect(page.getByText("Completed").first()).toBeVisible();
    // Nothing reached the server yet.
    expect((await sql<{ status: string }>(`SELECT status FROM "WorkOrder" WHERE id = $1`, [woId]))[0]!.status).toBe("ASSIGNED");

    await context.setOffline(false);
    await page.getByRole("button", { name: "Send now" }).click();
    await expect(page.getByTestId("pending")).toHaveText("Everything is sent", { timeout: 20_000 });
    const [wo] = await sql<{ status: string; actualStart: Date | null; signerName: string | null; tickets: number; photos: number }>(
      `SELECT status, "actualStart", "signerName",
         (SELECT count(*)::int FROM "WeightTicket" t WHERE t."workOrderId" = w.id) AS tickets,
         (SELECT count(*)::int FROM "EvidenceFile" e WHERE e."workOrderId" = w.id) AS photos
       FROM "WorkOrder" w WHERE id = $1`, [woId]);
    expect(wo).toMatchObject({ status: "COMPLETED", signerName: "Gardien du marché (synthetic)", tickets: 1, photos: 2 });
    expect(wo!.actualStart).not.toBeNull();

    // Sending again changes nothing.
    await page.getByRole("button", { name: "Send now" }).click();
    await expect(page.getByTestId("pending")).toHaveText("Everything is sent");
    const [again] = await sql<{ tickets: number; photos: number }>(
      `SELECT (SELECT count(*)::int FROM "WeightTicket" WHERE "workOrderId" = $1) AS tickets, (SELECT count(*)::int FROM "EvidenceFile" WHERE "workOrderId" = $1) AS photos`, [woId]);
    expect(again).toEqual({ tickets: 1, photos: 2 });
  });

  test("the API refuses calls without the app header, from another site, or without a session", async ({ page, request }) => {
    await login(page, email);
    const plain = await page.request.get("/api/field/v1/bundle");
    expect(plain.status()).toBe(403);
    const foreign = await page.request.post("/api/field/v1/actions", {
      headers: { "x-nexvo-field": "1", origin: "https://evil.example", "content-type": "application/json" },
      data: { id: randomUUID(), type: "start", workOrderId: woId, occurredAt: new Date().toISOString() },
    });
    expect(foreign.status()).toBe(403);
    const anon = await request.get("/api/field/v1/bundle", { headers: { "x-nexvo-field": "1" } }); // separate context, no cookie
    expect(anon.status()).toBe(401);
  });

  test("Arabic, phone width: right-to-left and no sideways scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, email, "ar");
    await page.goto("/ar/field");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: "مهامي" })).toBeVisible();
    await page.getByRole("button", { name: /Marché couvert/ }).click();
    await expect(page.getByRole("heading", { name: "Marché couvert (synthetic)" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
