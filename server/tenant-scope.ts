import { AsyncLocalStorage } from "node:async_hooks";
import { cache } from "react";

/**
 * Which organization the database session works for (D-91, row-level security). The database connection hook in
 * server/db.ts copies it into the PostgreSQL setting `app.org_id` every time a connection is taken from the pool;
 * the RLS policies then show and accept only that organization's rows. "*" (no tenant scope: platform console,
 * webhooks, public pages, jobs, scripts) is not restricted.
 *
 * Two carriers, because Next.js renders a page in pieces: server actions and API handlers run their work inside
 * runAsTenant() (AsyncLocalStorage); a page sets the per-request holder (React cache) when appPage() loads the tenant.
 */
type Holder = { orgId: string | null };

const als = new AsyncLocalStorage<Holder>();
const requestHolder = cache((): Holder => ({ orgId: null }));

function pageHolder(): Holder | null {
  try {
    return requestHolder();
  } catch {
    return null;
  }
}

export function runAsTenant<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  return als.run({ orgId }, fn);
}

/** Marks the rest of this page render as working for this organization. */
export function enterTenantForRequest(orgId: string) {
  const h = als.getStore() ?? pageHolder();
  if (h) h.orgId = orgId;
}

/** The organization for the next database connection, or "*" outside any tenant scope. */
export function currentTenantSetting(): string {
  return als.getStore()?.orgId ?? pageHolder()?.orgId ?? "*";
}
