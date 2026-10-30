import { execSync } from "node:child_process";
import pg from "pg";

/** Resets the disposable test database before the browser suite. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/test/.test(new URL(url).pathname)) throw new Error("TEST_DATABASE_URL must point at a *test* database");
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_prisma_migrations','spatial_ref_sys')`,
  );
  await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await client.query(`INSERT INTO "Plan" ("code","name","priceMonthly","priceYearly","maxUsers","maxVehicles","maxCustomers","customerPortal","advancedReports","isPublic","sortOrder") VALUES
    ('STARTER','Starter',9900,99000,5,3,50,false,false,true,1),
    ('PRO','Professional',24900,249000,20,15,400,true,true,true,2)`);
  await client.end();
}
