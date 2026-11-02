import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { addMember, isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { login } from "@/server/services/accounts";
import { rateLimit, resetRateLimits } from "@/server/rate-limit";
import { createCustomer } from "@/server/services/customers";
import { addManualLine, createDraftInvoice, issueInvoice } from "@/server/services/invoices";
import { collectionCertificate, receivablesAging } from "@/server/services/reports";
import { CONTAINER_SORTS, CUSTOMER_SORTS, INVOICE_SORTS, WORK_ORDER_SORTS, containersTable, customersTable, invoicesTable, workOrdersTable } from "@/server/services/tables";
import { tableState } from "@/server/table";
import { buildExport, tableToCsv, tableToXlsx } from "@/server/exports";
import type { OrgContext } from "@/server/context";

let a: OrgContext;
let b: OrgContext;
let ownerEmail: string;

beforeAll(async () => {
  await resetDb();
  const r = await newOrg();
  a = r.ctx;
  ownerEmail = r.user.email;
  b = (await newOrg()).ctx;
  await createCustomer(a, { name: "100% Recyclage" });
  await createCustomer(a, { name: "Ab_c Services" });
  await createCustomer(a, { name: "Abxc Services" });
  await createCustomer(a, { name: "=HYPERLINK(\"http://evil.test\")" });
  await createCustomer(b, { name: "Tenant B Secret" });
});

describe("shared rate limiter (Postgres)", () => {
  it("allows up to the limit then blocks, per key, and resets after the window", async () => {
    await resetRateLimits();
    const results = await Promise.all(Array.from({ length: 7 }, () => rateLimit("t:key1", 5, 60_000)));
    expect(results.filter((r) => r.ok)).toHaveLength(5);
    expect(results.find((r) => !r.ok)!.retryAfterMs).toBeGreaterThan(0);
    expect((await rateLimit("t:key2", 5, 60_000)).ok).toBe(true);
    await prisma.rateLimitBucket.update({ where: { key: "t:key1" }, data: { resetAt: new Date(Date.now() - 1) } });
    expect((await rateLimit("t:key1", 5, 60_000)).ok).toBe(true);
  });

  it("RATE_LIMIT_SCALE is ignored for non-localhost deployments (fail closed)", async () => {
    await resetRateLimits();
    const prev = [process.env.APP_URL, process.env.RATE_LIMIT_SCALE];
    process.env.APP_URL = "https://app.nexvo.example";
    process.env.RATE_LIMIT_SCALE = "100";
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await rateLimit("t:prod", 2, 60_000));
    expect(results.map((r) => r.ok)).toEqual([true, true, false]);
    [process.env.APP_URL, process.env.RATE_LIMIT_SCALE] = prev;
  });
});

describe("login lockout", () => {
  it("locks after 5 failures even with the right password, and audits it", async () => {
    for (let i = 0; i < 5; i++) await expect(login({ email: ownerEmail, password: "wrong-password-x" })).rejects.toThrow("errors.auth.invalidCredentials");
    await expect(login({ email: ownerEmail, password: "correct-horse-battery" })).rejects.toThrow("errors.auth.invalidCredentials");
    expect(await prisma.auditEvent.count({ where: { action: "user.locked" } })).toBe(1);
  });

  it("unlocks after the lock expires and resets the counter on success", async () => {
    await prisma.user.update({ where: { email: ownerEmail }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    await expect(login({ email: ownerEmail, password: "correct-horse-battery" })).resolves.toHaveProperty("token");
    const u = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
    expect(u.failedLogins).toBe(0);
    expect(u.lockedUntil).toBeNull();
  });

  it("unknown emails give the same error", async () => {
    await expect(login({ email: "nobody@example.test", password: "whatever-123" })).rejects.toThrow("errors.auth.invalidCredentials");
  });
});

describe("server-side tables", () => {
  const st = (q: Record<string, string>) => tableState(q, ["name", "code", "createdAt"] as const, { sort: "name" });

  it("never returns another tenant's rows", async () => {
    const page = await customersTable(a, st({ q: "Secret" }));
    expect(page.total).toBe(0);
    expect((await customersTable(b, st({}))).rows.map((r) => r.name)).toEqual(["Tenant B Secret"]);
  });

  it("treats % and _ in the search box literally", async () => {
    expect((await customersTable(a, st({ q: "%" }))).rows.map((r) => r.name)).toEqual(["100% Recyclage"]);
    expect((await customersTable(a, st({ q: "b_c" }))).rows.map((r) => r.name)).toEqual(["Ab_c Services"]);
  });

  it("search is accent- and case-insensitive on names", async () => {
    await createCustomer(a, { name: "Hôtel Él Djazaïr" });
    expect((await customersTable(a, st({ q: "hotel el djazair" }))).rows.map((r) => r.name)).toEqual(["Hôtel Él Djazaïr"]);
    expect((await customersTable(b, st({ q: "hotel" }))).total).toBe(0);
  });

  it("every whitelisted sort works in both directions on every table", async () => {
    for (const dir of ["asc", "desc"]) {
      for (const sort of CUSTOMER_SORTS) await customersTable(a, tableState({ sort, dir, q: "a" }, CUSTOMER_SORTS, { sort: "name" }));
      for (const sort of WORK_ORDER_SORTS) await workOrdersTable(a, tableState({ sort, dir, q: "a" }, WORK_ORDER_SORTS, { sort: "scheduledDate" }));
      for (const sort of INVOICE_SORTS) await invoicesTable(a, tableState({ sort, dir, q: "a" }, INVOICE_SORTS, { sort: "createdAt" }));
      for (const sort of CONTAINER_SORTS) await containersTable(a, tableState({ sort, dir, q: "a" }, CONTAINER_SORTS, { sort: "code" }));
    }
  });

  it("ignores unknown sort columns and clamps page size", () => {
    const s = st({ sort: "passwordHash", dir: "sideways", size: "100000", page: "-3" });
    expect(s).toMatchObject({ sort: "name", dir: "asc", pageSize: 25, page: 1 });
  });

  it("paginates with a stable total", async () => {
    const p = await customersTable(a, { ...st({ sort: "name", dir: "asc" }), pageSize: 2 });
    expect(p.total).toBe(5);
    expect(p.pages).toBe(3);
    expect(p.rows).toHaveLength(2);
  });

  it("requires the read permission", async () => {
    const driver = await addMember(a, "FIELD_WORKER");
    await expect(invoicesTable(driver, tableState({}, ["createdAt"] as const, { sort: "createdAt" }))).rejects.toThrow();
  });
});

describe("exports and documents", () => {
  it("CSV neutralises formula injection; export is tenant-scoped", async () => {
    const t = await buildExport(a, "customers", isoDay(-30), isoDay(0), "fr");
    const csv = tableToCsv(t);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.test"")"`);
    expect(csv).not.toContain("Tenant B Secret");
  });

  it("XLSX is a real zip workbook with localized Arabic headers", async () => {
    const t = await buildExport(a, "customers", isoDay(-30), isoDay(0), "ar");
    const buf = await tableToXlsx(t, "customers", "ar");
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    expect(t.header.some((h) => /[؀-ۿ]/.test(h))).toBe(true);
  });

  it("exports require permissions", async () => {
    const portalCustomer = await createCustomer(a, { name: "Portail" });
    const portal = await addMember(a, "CUSTOMER_PORTAL", portalCustomer.id);
    await expect(buildExport(portal, "customers", isoDay(-30), isoDay(0), "fr")).rejects.toThrow();
    await expect(buildExport(portal, "invoices", isoDay(-30), isoDay(0), "fr")).rejects.toThrow();
  });

  it("receivables aging buckets open balances by days past due", async () => {
    const c = await createCustomer(a, { name: "Aging client" });
    for (const [due, price] of [[isoDay(10), "100"], [isoDay(-5), "200"], [isoDay(-45), "300"], [isoDay(-120), "400"]] as const) {
      const d = await createDraftInvoice(a, { customerId: c.id, workOrderIds: [] });
      await addManualLine(a, d.id, { description: "x", quantity: "1", unitPrice: price, taxRateBps: 0 });
      await issueInvoice(a, d.id, { issueDate: isoDay(-150), dueDate: due });
    }
    const ag = await receivablesAging(a);
    expect(ag.NOT_DUE.minor).toBe(10000);
    expect(ag.D1_30.minor).toBe(20000);
    expect(ag.D31_60.minor).toBe(30000);
    expect(ag.D61_90.minor).toBe(0);
    expect(ag.D90_PLUS.minor).toBe(40000);
    expect((await receivablesAging(b)).D90_PLUS.minor).toBe(0);
  });

  it("collection certificate: portal sees only its own customer; other tenants get 404", async () => {
    const mine = await createCustomer(a, { name: "Cert client" });
    const theirs = await createCustomer(a, { name: "Other client" });
    const portal = await addMember(a, "CUSTOMER_PORTAL", mine.id);
    const month = isoDay(0).slice(0, 7);
    const cert = await collectionCertificate(portal, mine.id, month);
    expect(cert.reference).toMatch(/^ATT-.+-\d{6}$/);
    await expect(collectionCertificate(portal, theirs.id, month)).rejects.toThrow();
    await expect(collectionCertificate(b, mine.id, month)).rejects.toThrow(/not found|NotFound/i);
  });
});
