import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createCustomer, listCustomers } from "@/server/services/customers";
import { runAsTenant } from "@/server/tenant-scope";
import type { OrgContext } from "@/server/context";

/**
 * Row-level security (D-91). The policies are checked as a non-owner role without BYPASSRLS, the way the production
 * application role connects (the test suite itself connects as the owner, which RLS does not restrict).
 */
const EXCLUDED = ["Membership", "Invitation", "SupportAccessGrant"];
const PROBE = "nexvo_rls_probe";
let a: OrgContext, b: OrgContext;
let db: Client;

/** Runs SQL as the probe role with the given app.org_id (undefined = not set), inside a rolled-back transaction. */
async function asApp<T>(orgSetting: string | undefined, fn: (c: Client) => Promise<T>): Promise<T> {
  await db.query("BEGIN");
  try {
    await db.query(`SET LOCAL ROLE ${PROBE}`);
    if (orgSetting !== undefined) await db.query("SELECT set_config('app.org_id', $1, true)", [orgSetting]);
    return await fn(db);
  } finally {
    await db.query("ROLLBACK");
  }
}

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "RLS A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "RLS B")).ctx;
  await createCustomer(a, { name: "Client A (synthetic)" });
  await createCustomer(b, { name: "Client B (synthetic)" });
  db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  // CI connects as a superuser and can create the probe role; a developer database gets it once from the admin
  // (see TEST-PLAN.md). Table privileges are granted by the owner, which the test user is.
  await db.query(`DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${PROBE}') THEN CREATE ROLE ${PROBE} NOLOGIN NOBYPASSRLS; END IF; END$$`);
  await db.query(`DO $$BEGIN EXECUTE format('GRANT ${PROBE} TO %I', current_user); EXCEPTION WHEN insufficient_privilege THEN NULL; END$$`);
  await db.query(`GRANT USAGE ON SCHEMA public TO ${PROBE}; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${PROBE}`);
});

afterAll(async () => {
  await db?.end();
});

describe("row-level security", () => {
  it("every table with an organizationId has RLS on, except the reviewed exclusions", async () => {
    const rows = await prisma.$queryRaw<{ table: string; rls: boolean }[]>`
      SELECT c.table_name AS "table", t.relrowsecurity AS rls FROM information_schema.columns c
      JOIN pg_class t ON t.relname = c.table_name AND t.relnamespace = 'public'::regnamespace
      WHERE c.table_schema = 'public' AND c.column_name = 'organizationId'`;
    const missing = rows.filter((r) => !r.rls && !EXCLUDED.includes(r.table)).map((r) => r.table);
    expect(missing).toEqual([]);
  });

  it("a tenant session sees and changes only its own rows", async () => {
    const names = await asApp(a.org.id, async (c) => (await c.query(`SELECT name FROM "Customer" ORDER BY name`)).rows.map((r) => r.name));
    expect(names).toEqual(["Client A (synthetic)"]);
    const updated = await asApp(a.org.id, async (c) => (await c.query(`UPDATE "Customer" SET name = 'x' WHERE "organizationId" = $1`, [b.org.id])).rowCount);
    expect(updated).toBe(0);
  });

  it("writing a row for another organization is refused", async () => {
    await expect(asApp(a.org.id, (c) => c.query(`INSERT INTO "CustomerNote"(id, "organizationId", "customerId", body, "authorId") SELECT 'rls-x', $1, id, 'intrus', $2 FROM "Customer" LIMIT 1`, [b.org.id, a.userId])))
      .rejects.toThrow(/row-level security/);
  });

  it("'*' (no tenant scope) sees everything; a session that never set the value sees nothing", async () => {
    expect(await asApp("*", async (c) => Number((await c.query(`SELECT count(*) FROM "Customer"`)).rows[0].count))).toBe(2);
    expect(await asApp(undefined, async (c) => Number((await c.query(`SELECT count(*) FROM "Customer"`)).rows[0].count))).toBe(0);
  });

  it("the application states its tenant at each connection checkout", async () => {
    const setting = () => prisma.$queryRaw<{ v: string }[]>`SELECT current_setting('app.org_id', true) AS v`.then((r) => r[0]!.v);
    expect(await runAsTenant(a.org.id, setting)).toBe(a.org.id);
    expect(await setting()).toBe("*");
    expect(await runAsTenant(b.org.id, () => prisma.$transaction((tx) => tx.$queryRaw<{ v: string }[]>`SELECT current_setting('app.org_id', true) AS v`))).toEqual([{ v: b.org.id }]);
    // Services keep working inside a tenant scope.
    expect((await runAsTenant(a.org.id, () => listCustomers(a))).map((c: { name: string }) => c.name)).toContain("Client A (synthetic)");
  });
});
