import { runAsTenant } from "@/server/tenant-scope";
import "server-only";
import { NextResponse } from "next/server";
import { currentSession } from "../auth/session";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { rateLimit } from "../rate-limit";
import type { OrgContext } from "../context";

/** Header the offline app sends on every call; a cross-site form or <img> cannot set it (CSRF defence with the Origin check). */
export const FIELD_HEADER = "x-nexvo-field";

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return req.method === "GET"; // browsers always send Origin on POST from fetch()
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Session cookie + same origin + custom header + per-user rate limit, then runs `fn` with the tenant context. */
export async function withFieldSession(req: Request, fn: (ctx: OrgContext) => Promise<unknown>) {
  if (req.headers.get(FIELD_HEADER) !== "1" || !sameOrigin(req)) return NextResponse.json({ error: "errors.forbidden" }, { status: 403 });
  const s = await currentSession();
  if (!s?.ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimit(`field:${s.ctx.userId}`, 600, 10 * 60_000)).ok) return NextResponse.json({ error: "errors.rateLimited" }, { status: 429 });
  try {
    const body = await runAsTenant(s.ctx.org.id, () => fn(s.ctx!));
    return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof NotFoundError) return NextResponse.json({ error: e.code }, { status: 404 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.code }, { status: 403 });
    // Business rule refused the action: permanent, the phone shows it to the driver instead of retrying.
    if (e instanceof DomainError) return NextResponse.json({ error: e.code, details: e.details ?? null }, { status: 422 });
    throw e;
  }
}
