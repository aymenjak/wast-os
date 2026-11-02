import { test, expect, type Browser } from "@playwright/test";
import { login, register, sql, tinyJpeg, uid, PASSWORD } from "./helpers";

/**
 * Acceptance scenarios A–F through the real UI against a production build:
 * register → customer → contract → request → dispatch → field evidence → invoice → payment,
 * then a second tenant tries to reach the first tenant's records.
 */
test.describe.serial("NEXVO Business end-to-end", () => {
  const id = uid();
  const ownerEmail = `owner-${id}@e2e.test`;
  const workerEmail = `worker-${id}@e2e.test`;
  let customerUrl = "";
  let workOrderUrl = "";
  let invoiceUrl = "";

  test("A: company registers and invites a field worker", async ({ page, browser }) => {
    await register(page, { org: `E2E Collecte ${id}`, email: ownerEmail });
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    await page.goto("/en/app/team");
    await page.locator('input[name="email"]').fill(workerEmail);
    await page.locator('select[name="role"]').selectOption("FIELD_WORKER");
    await page.getByRole("button", { name: "Invite member" }).click();
    const link = await page.getByTestId("invite-link").textContent();
    expect(link).toMatch(/\/en\/invite\//);

    const worker = await (browser as Browser).newContext();
    const wp = await worker.newPage();
    await wp.goto(link!);
    await wp.locator('input[name="name"]').fill("Field Worker");
    await wp.locator('input[name="password"]').fill(PASSWORD);
    await wp.getByRole("button", { name: "Accept invitation" }).click();
    await wp.waitForURL(/\/app\/work-orders/);
    await expect(wp.getByRole("heading", { name: "My work" })).toBeVisible();
    // Field workers do not get commercial navigation…
    await expect(wp.getByRole("link", { name: "Invoices" })).toHaveCount(0);
    // …and the server refuses the page even if the URL is typed directly.
    await wp.goto("/en/app/invoices");
    await expect(wp.getByText("This page is not available for your role.")).toBeVisible();
    await worker.close();
  });

  test("B: customer, service location, active contract, collection request", async ({ page }) => {
    await login(page, ownerEmail);
    await page.goto("/en/app/customers/new");
    await page.locator('input[name="name"]').fill("Hotel Atlas (synthetic)");
    await page.locator('input[name="taxId"]').fill("000099999999999");
    await page.getByRole("button", { name: "Create" }).click();
    await page.waitForURL(/\/app\/customers\/c/);
    customerUrl = page.url();

    await page.locator('input[name="label"]').fill("Main kitchen");
    await page.locator('input[name="addressLine"]').fill("1 Synthetic Street");
    await page.locator('input[name="latitude"]').fill("35.705800");
    await page.locator('input[name="longitude"]').fill("-0.645900");
    await page.getByRole("button", { name: "Add location" }).last().click();
    await expect(page.getByText("35.7058, -0.6459")).toBeVisible();

    const customerId = customerUrl.split("/").pop()!;
    await page.goto(`/en/app/contracts/new?customer=${customerId}`);
    await page.locator('input[name="title"]').fill("Daily kitchen waste");
    await page.locator('select[name="lines.0.serviceLocationId"]').selectOption({ label: "Main kitchen" });
    await page.locator('select[name="lines.0.wasteCategoryId"]').selectOption({ label: "Household & similar waste" });
    await page.locator('select[name="lines.0.billingUnit"]').selectOption("PER_COLLECTION");
    await page.locator('input[name="lines.0.unitPrice"]').fill("3500");
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL(/\/app\/contracts\/c/);
    await page.getByRole("button", { name: "Activate" }).click();
    await expect(page.getByText("Active").first()).toBeVisible();

    await page.goto(`/en/app/requests/new?customer=${customerId}`);
    await page.locator('select[name="wasteCategoryId"]').selectOption({ label: "Household & similar waste" });
    await page.getByRole("button", { name: "Submit" }).click();
    await page.waitForURL(/\/app\/requests$/);
    await page.getByRole("button", { name: "Validate & create work order" }).click();
    await expect(page.getByText("No requests.")).toBeVisible(); // left the "to validate" queue
    await page.goto("/en/app/requests?status=ALL");
    await expect(page.getByRole("link", { name: /^WO-\d{5}$/ })).toBeVisible();
  });

  test("C: dispatcher creates team and vehicle, assigns the work order", async ({ page }) => {
    await login(page, ownerEmail);
    await page.goto("/en/app/fleet");
    await page.locator('input[name="plateNumber"]').fill(`E2E-${id}`);
    await page.locator('input[name="label"]').fill("Compactor 1");
    await page.getByRole("button", { name: "Add vehicle" }).last().click();
    await expect(page.getByRole("link", { name: `E2E-${id}`.toUpperCase() })).toBeVisible();
    await page.locator('input[name="name"]').fill("Team North");
    await page.getByRole("button", { name: "New team" }).click();
    await page.locator('select[name="membershipId"]').selectOption({ label: "Field Worker, Field worker" });
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.locator("li", { hasText: "Team North" }).getByText("Field Worker")).toBeVisible();

    await page.goto("/en/app/dispatch");
    const card = page.locator("li", { has: page.getByRole("link", { name: /^WO-/ }) }).first();
    await card.locator('select[name="teamId"]').selectOption({ label: "Team North" });
    await card.locator('select[name="vehicleId"]').selectOption({ index: 1 });
    await card.getByRole("button", { name: "Assign" }).click();
    await expect(page.getByText("1 stops")).toBeVisible();
    workOrderUrl = (await page.getByRole("link", { name: /^WO-/ }).first().getAttribute("href"))!;
  });

  test("D: field worker starts, uploads evidence and completes", async ({ page }) => {
    await login(page, workerEmail);
    await page.goto(workOrderUrl);
    await page.getByRole("button", { name: "Complete" }).waitFor({ state: "detached" }).catch(() => undefined);
    await page.getByRole("button", { name: "Start work" }).click();
    await expect(page.getByText("In progress").first()).toBeVisible();
    await page.locator('input[name="file"]').setInputFiles({ name: "after.jpg", mimeType: "image/jpeg", buffer: tinyJpeg() });
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.locator('img[src^="/api/files/"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Complete" }).click();
    await page.locator('textarea[name="completionNotes"]').fill("Collected 2 containers.");
    await page.getByRole("button", { name: "Complete" }).click();
    await expect(page.getByText("Completed").first()).toBeVisible();
    // Stored file must not contain the EXIF payload.
    const [ev] = await sql<{ id: string; sizeBytes: number }>(`SELECT id, "sizeBytes" FROM "EvidenceFile" ORDER BY "createdAt" DESC LIMIT 1`);
    expect(ev!.sizeBytes).toBeLessThan(tinyJpeg().length);
  });

  test("E: invoice from the completed work order; payment recorded accurately", async ({ page }) => {
    await login(page, ownerEmail);
    const customerId = customerUrl.split("/").pop()!;
    await page.goto(`/en/app/invoices/new?customer=${customerId}`);
    await expect(page.locator('input[name="workOrderIds[]"]')).toBeChecked();
    await page.getByRole("button", { name: "Create draft" }).click();
    await page.waitForURL(/\/app\/invoices\/c/);
    invoiceUrl = page.url();
    await expect(page.getByText("4,165.00").first()).toBeVisible(); // 3,500.00 + 19% VAT
    await page.getByRole("button", { name: "Issue invoice" }).click();
    await expect(page.getByRole("heading", { name: /INV-\d{4}-00001/ })).toBeVisible();
    await page.locator('input[name="amount"]').fill("1000");
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Partially paid").first()).toBeVisible();
    await expect(page.getByTestId("invoice-balance")).toContainText("3,165.00");
    await page.getByRole("button", { name: "Record payment" }).click(); // default amount = remaining balance
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("invoice-balance")).toContainText("0.00");
    const rows = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM "Payment"`);
    expect(rows[0]?.n).toBe("2");
    // Email the invoice: queued in the outbox (no SMTP in the test environment), audited.
    await page.locator('input[name="to"]').fill("accounts@client.example");
    await page.getByRole("button", { name: "Send invoice" }).click();
    await expect(page.getByText(/Queued for accounts@client\.example/)).toBeVisible();
    const mail = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM "Notification" WHERE "recipient" = 'accounts@client.example' AND "type" = 'invoice.sent'`);
    expect(mail[0]?.n).toBe("1");
  });

  test("F: another tenant cannot reach these records", async ({ page }) => {
    await register(page, { org: `Intruder ${id}`, email: `intruder-${id}@e2e.test` });
    for (const url of [customerUrl, workOrderUrl, invoiceUrl]) {
      const res = await page.goto(url.replace(/^https?:\/\/[^/]+/, ""));
      expect(res?.status(), url).toBe(404);
    }
    const [ev] = await sql<{ id: string }>(`SELECT id FROM "EvidenceFile" LIMIT 1`);
    const file = await page.request.get(`/api/files/${ev!.id}`);
    expect(file.status()).toBe(404);
    const exp = await page.request.get(`/api/exports/invoices?from=2000-01-01&to=2100-01-01`);
    expect(await exp.text()).not.toContain("Hotel Atlas");
    const anon = await page.context().browser()!.newContext();
    expect((await anon.request.get(`http://localhost:3100/api/files/${ev!.id}`)).status()).toBe(404);
    await anon.close();
  });
});
