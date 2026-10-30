import type { Db } from "./db";

/** Atomically allocates the next value of a per-organization sequence. Call inside the business transaction. */
export async function nextSequence(db: Db, organizationId: string, name: string): Promise<number> {
  const rows = await db.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("organizationId", "name", "value") VALUES (${organizationId}, ${name}, 1)
    ON CONFLICT ("organizationId", "name") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  const value = rows[0]?.value;
  if (typeof value !== "number") throw new Error("Counter allocation failed");
  return value;
}

export async function nextNumber(db: Db, organizationId: string, name: string, prefix: string, width = 5) {
  const n = await nextSequence(db, organizationId, name);
  return `${prefix}-${String(n).padStart(width, "0")}`;
}
