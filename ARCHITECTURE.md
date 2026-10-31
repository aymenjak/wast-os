# Architecture

## 1. Stack (versions pinned in package.json)

| Concern | Choice | Version | Why |
|---------|--------|---------|-----|
| Web framework | Next.js App Router, server components + server actions | 16.4.3 (stable) | One deployable for public site, app and API; server actions give CSRF-safe forms (origin check) without a separate API layer |
| UI | React, Tailwind CSS v4, lucide icons, self-hosted fonts (Inter, IBM Plex Sans Arabic) | 19.3 / 4.3.3 | No runtime CSS-in-JS; logical properties for RTL; fonts served locally (no third-party font requests) |
| Database | PostgreSQL + PostGIS | 16 / 3.4 | Relational integrity for money and contracts; spatial queries for duplicates and routing |
| ORM | Prisma ORM with `@prisma/adapter-pg` | 7.10.1 (latest *stable*; 8.0 is RC, deliberately not used) | Typed queries, migrations; raw SQL where needed (PostGIS, row locks, counters) |
| Validation | Zod | 4.6 | Every service parses its own input |
| Maps | Leaflet with configurable tile URL | 1.9.4 | Provider-neutral; no API key needed for dev |
| Tests | Vitest (unit + integration on a real DB), Playwright + axe-core | 5.0 / 1.63 | |

Rejected for now: microservices, a job queue, Redis, an external auth provider, a component library dependency (shadcn/Radix) — not justified at MVP scale. The Bolt prototype (Next 13.5, mock data) is preserved in `archive/bolt-prototype/`.

## 2. Layers

```
app/[locale]/…            Pages (server components). Read via services; render with dictionaries.
app/actions/*.ts          "use server" actions: parse FormData → call service → revalidate/redirect.
app/api/*                 Route handlers: file download, CSV export, payment webhook, health.
proxy.ts                  Locale negotiation only (no auth decisions).
server/services/*.ts      Use cases. Each takes an OrgContext, checks permission, scopes by organizationId,
                          validates with Zod, runs in a transaction, writes audit events.
server/domain/*.ts        Pure logic: permissions, state machines, invoice math. Unit-tested, no I/O.
server/{db,storage,routing,rate-limit,counters,audit}.ts   Infrastructure behind small interfaces.
lib/i18n                  Config, typed dictionaries (fr/ar must match en at compile time), Intl formatters.
components/               Design-system components; client components only where interaction needs it.
```

Rule: **pages and actions never query tenant data directly** except trivial lookups scoped by `ctx.org.id`; business rules live in services/domain so they are tested once and enforced everywhere.

## 3. Request flow (example: field worker completes a job)

1. Browser posts the form → server action `workOrderTransitionAction`.
2. `orgAction` resolves the session cookie → `OrgContext` (user, membership, role, org, permissions).
3. `transitionWorkOrder(ctx, id, "complete")`: loads the work order with `organizationId = ctx.org.id`; checks team membership; `planWorkOrderTransition` validates status + evidence count; updates in a transaction; syncs the linked request or civic report; writes audit.
4. Domain errors return as i18n keys; the form shows a translated message. Unexpected errors are logged server-side and shown generically.

## 4. Multi-tenancy

- Shared database, shared schema, `organizationId` on every tenant row.
- **Composite foreign keys** `(organizationId, id)` between tenant tables: the database itself rejects a work order in tenant B pointing to a location of tenant A (tested).
- Services always filter on `ctx.org.id`; "not yours" and "does not exist" both return not-found (pages render 404) to avoid existence leaks.
- Row-level security in Postgres is a planned defence-in-depth step (ROADMAP Phase 9).

## 5. Key mechanisms

| Mechanism | Implementation |
|-----------|----------------|
| Sessions | 256-bit random token in `HttpOnly; SameSite=Lax; Secure(prod)` cookie; only SHA-256 stored; 30-day sliding expiry; logout deletes the row |
| Passwords | scrypt N=2^17, r=8, p=1 (OWASP), parameters stored per hash; constant-time compare; dummy hash for unknown emails |
| Sequences | `Counter` table with `INSERT … ON CONFLICT DO UPDATE … RETURNING` inside the business transaction (REQ-, WO-, CUS-, INV-YYYY-) |
| Payments | `SELECT … FOR UPDATE` on the invoice + unique `(organizationId, idempotencyKey)`; webhook events unique on `(provider, externalEventId)` |
| Geo | lat/lng DECIMAL(9,6) + trigger-maintained `geography(Point,4326)` with GIST index |
| Files | `StorageProvider` interface; local disk in dev; magic-byte sniffing; 5 MB cap; JPEG EXIF/XMP/IPTC stripped; served only via authorized route with `no-store`, `nosniff`, sandbox CSP |
| Routing | `RoutingProvider` interface; default nearest-neighbour on haversine distance (planning aid, labelled as such) |
| Maps | `NEXT_PUBLIC_MAP_TILE_URL` (default public OSM tiles = dev/pilot only, per OSMF policy); no geocoding dependency |
| Notifications | Outbox table written inside business transactions; delivery worker not yet built (no email/SMS provider chosen) |
| Rate limiting | Shared fixed window in Postgres (`RateLimitBucket`, one atomic upsert) on login/register/invite/contact/civic/AI; works across instances |
| CSP | `proxy.ts` generates a nonce per HTML request (`x-nonce` header → Next injects it into its scripts); root layout reads `headers()`, so pages render dynamically |
| Online payment | `server/payments/chargily.ts`: hosted checkout (`PaymentCheckout` row) → signed webhook `/api/webhooks/chargily` → `applyPaymentTx` (same idempotent, row-locked path as manual payments) |
| Remote support | `SupportTicket`/`SupportMessage`; `SupportAccessGrant` (expiry, revocation); `Session.supportGrantId` makes `resolveSession` build a read-only VIEWER context (`ctx.support`) from the grant instead of a membership; `/[locale]/support-console` for `User.isPlatformStaff` |
| AI | `server/ai/provider.ts` (`AiProvider` interface; Claude implementation with structured output, server-side fallback, typed errors; test seam `setAiProvider`) → `server/services/ai.ts` (permissions, data minimisation, `AiSuggestion` log) |
| Tables | URL state (`?q&sort&dir&page&size&filter`) parsed by `server/table.ts` (sort whitelist, clamped size) → `server/services/tables.ts` (tenant-scoped, server-side search/sort/pagination, accent-insensitive names via `nexvo_fold`) → `components/data-table.tsx` (aria-sort headers, search, filter chips, Excel/CSV, pagination) |
| Documents | `server/exports.ts` (localized CSV/XLSX, RTL sheet for Arabic, `/api/exports/[kind]`); collection certificate (`collectionCertificate` + print view); receivables aging in `server/services/reports.ts` |

## 6. Map provider evaluation (summary)

| Option | Licensing/cost | Algerian coverage | Notes |
|--------|----------------|-------------------|-------|
| OSM public tiles | Free, heavy use forbidden (S-61) | Community data; quality varies by city — unverified | Dev/pilot only |
| Self-hosted OSM tiles/vector (e.g. OpenMapTiles/Protomaps) | Infra cost, ODbL attribution | Same data | Production candidate; full privacy control |
| Mapbox / commercial | Usage-based, key required | Not verified for Algeria | Evaluate with real addresses before committing |
| Geocoding | Public Nominatim forbids bulk use (S-60) | Algerian addresses often informal | MVP stores coordinates picked on map or GPS; no geocoder |

## 7. Known architectural limitations

- Rendering every page dynamically (needed for the CSP nonce) gives up static caching of public pages; acceptable at pilot scale.
- No background worker (notifications stay in outbox; contract expiry is computed on read).
- Local-disk storage in dev; production needs S3-compatible storage implementation of `StorageProvider`.
- Cross-tenant civic contractor assignment not implemented (municipality assigns its own teams).
