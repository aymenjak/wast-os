/**
 * Fixed-window in-memory rate limiter.
 * Limitation: per-process only. A multi-instance deployment must swap this for a
 * shared store (Postgres or Redis) behind the same function signature — see SECURITY.md.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// E2E suites run many sign-ups from one IP; they may raise limits outside production only.
const SCALE = process.env.NODE_ENV !== "production" || process.env.NEXVO_E2E === "1" ? Number(process.env.RATE_LIMIT_SCALE ?? 1) || 1 : 1;

export function rateLimit(key: string, baseLimit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const limit = baseLimit * SCALE;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfterMs: 0 };
  }
  bucket.count += 1;
  return bucket.count > limit ? { ok: false, retryAfterMs: bucket.resetAt - now } : { ok: true, retryAfterMs: 0 };
}

export function resetRateLimits() {
  buckets.clear();
}
