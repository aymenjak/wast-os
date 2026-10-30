import { execSync } from "node:child_process";

/** Applies migrations to the disposable test database. Refuses to run against anything not named *test*. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/test/.test(new URL(url).pathname)) {
    throw new Error("TEST_DATABASE_URL must point to a database whose name contains 'test'");
  }
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
