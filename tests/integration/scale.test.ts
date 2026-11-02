import { beforeAll, describe, expect, it } from "vitest";
import { newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { createDestination, recoveryReport } from "@/server/services/recycling";
import { territoryReport } from "@/server/services/territory";
import { buildExport } from "@/server/exports";
import type { OrgContext } from "@/server/context";

/**
 * Pre-pilot load regression: above ~32k rows, Prisma `include` builds `IN (…)` lists that exceed PostgreSQL's
 * bind-parameter limit (65535) — the recycling page, territory report and work-order export returned HTTP 500 on a year of
 * pilot-scale data. These queries now use one SQL statement with joins; this test keeps it that way.
 */
let a: OrgContext;
const N = 35_000;
const today = new Date().toISOString().slice(0, 10);
const yearAgo = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  await resetDb();
  a = (await newOrg()).ctx;
  const cust = (await createCustomer(a, { name: "Client volume (synthetic)" })).id;
  const loc = (await addServiceLocation(a, cust, { label: "Site", addressLine: "Rue", commune: "Oran", wilaya: "Oran" })).id;
  const dest = (await createDestination(a, { name: "Recycleur volume (synthetic)", kind: "RECYCLER" })).id;
  const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: a.org.id, code: "CARDBOARD" } });
  await prisma.$executeRawUnsafe(
    `INSERT INTO "WorkOrder" (id, "organizationId", number, kind, status, "customerId", "serviceLocationId", "wasteCategoryId", "scheduledDate", "createdById", "createdAt", "updatedAt")
     SELECT 'scalewo' || g, $1, 'WO-S' || g, 'COLLECTION', 'COMPLETED', $2, $3, $4, current_date - (g % 360), $5, now(), now() FROM generate_series(1, ${N}) g`,
    a.org.id, cust, loc, cat.id, a.userId);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "WeightTicket" (id, "organizationId", "workOrderId", "grossKg", "tareKg", "netKg", "rejectedKg", "weighedAt", "recordedById", stream, "destinationId", contaminated, "createdAt")
     SELECT 'scalet' || g, $1, 'scalewo' || g, 1010, 1000, 10, 0, (current_date - (g % 360))::timestamptz + interval '8 hours', $2, 'PAPER_CARDBOARD', $3, false, now() FROM generate_series(1, ${N}) g`,
    a.org.id, a.userId, dest);
  // Fresh statistics, as autovacuum would provide in production; without them the planner assumes empty tables (~60 s).
  await prisma.$executeRawUnsafe(`ANALYZE "WorkOrder", "WeightTicket"`);
}, 120_000);

describe(`reports over ${N} tickets`, () => {
  it("recycling report, territory report and work-order export work and add up", async () => {
    const r = await recoveryReport(a, { from: yearAgo, to: today });
    expect(r.tickets).toBe(N);
    expect(r.total.recovered).toBe(N * 1000); // 10 kg each, in hundredths
    const t = await territoryReport(a, { from: yearAgo, to: today });
    expect(t.communes[0]).toMatchObject({ commune: "Oran", recovered: N * 1000 });
    const x = await buildExport(a, "work-orders", yearAgo, today, "en");
    expect(x.rows).toHaveLength(N);
    expect(x.rows[0]![9]).toBe(10);
  }, 120_000);
});
