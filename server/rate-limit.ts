import { prisma } from "./db";

/**
 * Shared fixed-window rate limiter backed by Postgres, so limits hold across app instances.
 * One atomic upsert per check: the window resets when it expires.
 *
 * Test suites may scale limits with RATE_LIMIT_SCALE, but only when the app is served from
 * localhost (fail-closed: a production URL always uses the real limits).
 */
function scale() {
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.APP_URL ?? "");
  return local ? Number(process.env.RATE_LIMIT_SCALE ?? 1) || 1 : 1;
}

export async function rateLimit(key: string, baseLimit: number, windowMs: number): Promise<{ ok: boolean; retryAfterMs: number }> {
  const limit = baseLimit * scale();
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "RateLimitBucket"."resetAt" END
    RETURNING "count", "resetAt"`;
  const row = rows[0]!;
  return row.count > limit ? { ok: false, retryAfterMs: row.resetAt.getTime() - Date.now() } : { ok: true, retryAfterMs: 0 };
}

/** Housekeeping: delete expired buckets (call from a periodic job). */
export async function purgeRateLimits() {
  await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } });
}

/** Test helper. */
export async function resetRateLimits() {
  await prisma.rateLimitBucket.deleteMany({});
}
