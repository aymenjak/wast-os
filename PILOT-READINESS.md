# Pilot readiness review — 2026-11-01

Scope requested by the project owner: security, performance, backup, audit trail, and a field test on a phone, before a pilot. Everything below was **executed** in this environment (local PostgreSQL 16 + PostGIS, production build `next build` / `next start`, Chromium via Playwright). Nothing was deployed; no external service was contacted.

## Verdict

**Ready for a supervised pilot on a single server**, once the items in "Before the pilot starts" are done by the project owner (they need infrastructure, accounts or legal sign-off this environment does not have). Seven defects were found and fixed during the review — two of them would have broken the pilot (HTTP 500 at real volume; finishing a job on a phone).

## 1. Security

| Check | How | Result |
|---|---|---|
| Dependencies | `npm audit --omit=dev` | 0 vulnerabilities |
| Secrets in the repository | pattern scan of all tracked files (cloud keys, private keys, tokens) | none; only `.env.example` with placeholders |
| Tenant isolation | script listing every Prisma call in `server/services` without an `organizationId` filter (204), each reviewed | **no leak**: all are updates by id after a scoped lookup, user-level tables (sessions, 2FA, resets), single-use public tokens, or platform-staff functions behind `requireStaff` |
| Authorization | script listing exported service functions taking `ctx` without a permission check | all guarded (local helpers), except two aggregate helpers → **fixed** (defence in depth: `iotKpis`, `recyclingKpis`) |
| API without a session | every route under `/api` probed | all refuse (401/403/404) except `/api/health` |
| HTTP headers | `curl -I` on HTML pages | nonce CSP, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy. **HSTS was missing → fixed** (sent only when `APP_URL` is `https://`; `APP_URL` must be set at **build** time) |
| Session cookie | code review | httpOnly, Secure under HTTPS, SameSite=Lax |
| Rate limiting | observed during the field test | the login limiter blocked repeated sign-ins from one IP, as designed (`RATE_LIMIT_SCALE` only works on localhost) |

Remaining gaps (unchanged, documented in SECURITY.md): no Postgres row-level security; no antivirus scan of PDFs; PNG/WebP metadata not stripped; no independent penetration test; session list/revoke UI.

## 2. Audit trail

- **Coverage**: script listing service functions that write without auditing. Missing and **now audited**: invitation revocation, team creation, adding/removing a team member (it changes which jobs a field worker sees), manual invoice line added/removed, IoT alert resolved, customer contact added (no personal data copied into the audit entry). Already covered elsewhere: role/status changes, payments (incl. webhooks).
- **Tamper resistance** (SECURITY.md gap 6, partly closed): a database trigger makes `AuditEvent` **append-only** — `UPDATE` and `DELETE` are refused even for the application role and the database superuser (verified). `TRUNCATE` (test reset, DBA) is unaffected. Exporting the trail to external append-only storage remains to do.
- Tests: `tests/integration/audit-trail.test.ts` (coverage + append-only).

## 3. Backup and restore — drill executed

| Step | Result |
|---|---|
| Backup (`scripts/ops/db-backup.sh`, `pg_dump -Fc`, app credentials) | 0.2 s, 244 KB on the demo database |
| First restore attempt | 3 errors (comments on PostGIS/citext extensions, PostGIS `spatial_ref_sys` data) — harmless but alarming in an incident → procedure **fixed**: dump excludes `spatial_ref_sys` data, restore skips comments and stops on first error |
| Restore into an empty database (`scripts/ops/restore-drill.sh`) | exit code 0 in 0.6–2 s; `prisma migrate status`: up to date |
| Integrity | row counts identical on 9 tables (organizations, work orders, tickets, invoices, audit events, hazardous movements, bales, PostGIS reference data); triggers present (append-only audit, PostGIS sync) |
| Application on the restored copy | up in 1 s; real sign-in; invoice INV-2026-00002 opened; recycling page 21 % |

Not covered by the drill: uploaded files (local `UPLOAD_DIR` — back it up separately), off-site encrypted copy and retention (infrastructure).

## 4. Performance at pilot scale

A scratch copy received **40,000 work orders and 60,000 weight tickets over 12 months** (synthetic).

**Defect found: HTTP 500** on the recycling page, the territory report and the recovery and work-order exports — Prisma `include` loads relations with `IN (…ids)` lists and exceeded PostgreSQL's bind-parameter limit beyond ~32,000 rows. Invisible on demo data. **Fixed** with single SQL queries using joins; regression test `tests/integration/scale.test.ts` (35,000 tickets).

| Page / export (12 months, warm server, median of 5) | After the fix |
|---|---|
| Dashboard | 81 ms |
| Work orders, invoices, reports, yard report, certificate, hazardous declaration | 37–49 ms |
| Territory report | 247 ms |
| Recycling page | 767 ms |
| Export work orders (40,000 rows) | 1.8 s xlsx · 0.5 s csv |
| Export recovery ledger (60,000 rows) | 3.2 s xlsx (2.6 MB) |

Also learned: right after a bulk import, queries are slow until PostgreSQL has statistics (69 s → 6 s in the test with `ANALYZE`); autovacuum handles this in production — run `ANALYZE` after any data migration.

Watch points: invoice and customer exports still use `include` (fine at pilot volume, same limit beyond ~30,000 invoices); the recycling page aggregates in the application (fine to ~100k tickets/year; move to SQL aggregation later).

## 5. Field test on a phone

Driver account, **Arabic UI**, real flow on the production build: sign in → my work → open job → start → photo → weight → finish. Emulated Pixel 5 and iPhone 13, network throttled, **CPU slowed ×4**.

**Defects found and fixed:**
1. **The work-order page scrolled sideways on phones** (grid items grew to the width of the weight-tickets table) — the action bar then ended up off-screen and "finish" could not be tapped. Fixed for the **whole app** (`.grid > * { min-width: 0 }`), plus the invoice list's large amounts (stat tiles now shrink on small screens).
2. **"Finish" was at the top of a long page** while the weight is entered at the bottom → on phones the job actions are now a **bar fixed to the bottom of the screen** (safe-area aware, page padded so it never covers content).
3. **Keyboard focus could hide under the sticky header** (WCAG 2.4.11) → `scroll-padding-top`.
4. **Photo upload took 24 s on slow 3G** for a 1 MB photo → photos are now **shrunk on the phone** before upload (≤ 1600 px, JPEG 0.75; upload button waits during compression; original sent if anything fails). A 3.4 MB, 3000×2250 photo is stored as 627 KB (noise test image — real photos compress further).
5. **Checkboxes were 16 px** → 20 px box with a 44 px tap area (gloves).

**Result after fixes:**

| Step | Pixel 5 · 3G (1.6 Mb/s, 150 ms) | iPhone 13 · slow 3G (0.4 Mb/s, 400 ms) |
|---|---|---|
| Open sign-in page (first visit) | 2.0 s | 8.1 s |
| Sign in → my work | 1.8 s | 2.9 s |
| Open the job | 0.9 s | 1.4 s |
| Start work | 1.7 s | 4.3 s |
| Photo 3.4 MB: compress + upload | 10.2 s | 16.5 s |
| Record weight | 1.0 s | 2.5 s |
| Finish (bar visible right after weighing) | 1.0 s | 2.7 s |
| **Whole job** | **18.6 s** | **38.4 s** |

No horizontal overflow on **93 page views** (393 px wide, Arabic/French/English, owner and driver). Every control ≥ 40 px high; action buttons 48 px.

Remaining for the field: the **first visit on slow 3G takes 8 s** (JavaScript download) and nothing works **without network** — both point to the offline-capable driver mode proposed next (service worker cache + queued actions).

**Follow-up done (D-77): offline driver mode** at `/{locale}/field` (link "Offline mode" on My work). The jobs open and a whole job (start, photo, weight, finish) can be done with no network; it is sent automatically, in order and exactly once, when the network returns (verified in Chromium with the network cut, e2e `field-offline.spec`). On emulated slow 3G with CPU ×4 the page reopens in 0.6 s online and 0.4 s offline after the first visit. Still to check on real phones, including iPhones (Safari limits how long browser storage is kept).

## Before the pilot starts (owner actions)

1. Server with HTTPS; build with `APP_URL=https://…` (enables HSTS and Secure cookies); `APP_ENCRYPTION_KEY`, `PAYMENT_WEBHOOK_SECRET` set (DEPLOYMENT.md §2).
2. Nightly `scripts/ops/db-backup.sh` + copy of `UPLOAD_DIR`, encrypted, off-site, 30 days; one restore drill on the real server with `scripts/ops/restore-drill.sh`.
3. Uptime check on `/api/health`, error tracking, disk/CPU alerts.
4. Legal review items (PRIVACY-AND-COMPLIANCE.md §5, ANPDP declaration) and invoice format validated by an accountant.
5. CI run on GitHub (`.github/workflows/ci.yml`) — not observable from this environment.
6. A real-phone check with two or three drivers (the emulation above does not replace real devices, sunlight and gloves).

## System review — 2026-11-06

Requested by the project owner: review the whole system and user experience, remove defects and anything that blocks users, and harden data protection.

**Method.** A crawler signed in as each role (owner, dispatcher, driver, finance, municipality, customer portal, platform owner, NEXVO support, anonymous visitor), followed every link (GET only, no form submitted) on a 390 px phone screen, and replayed every page in Arabic, French and English: 243 distinct pages, 738 page views. Each view checked HTTP status, browser console errors, horizontal overflow, untranslated keys or `undefined`/`NaN`, load time, and (Arabic) axe WCAG 2.1 AA serious/critical rules. Translations were checked statically (no missing key; no Arabic/French text left in English).

| Finding (round 1) | Count | Fix |
|---|---|---|
| Dispatcher saw a customer's invoices **with amounts** although the role cannot read invoices | security | Service no longer returns invoices without `invoices.read`; card hidden; regression test |
| Links to pages the role cannot open (driver → customer/contract, finance → vehicle/container, dispatcher → invoice) | 27 dead links | Shown as plain text when the role lacks the permission |
| Sensors page crashed (HTTP 500) for finance | 1 page | Page-level permission check; two other unguarded pages fixed; friendly error page for the app |
| 404 page with no way back (link to the public site, request left pending) | all 404s | Localised page with Back / My workspace / Home |
| Signed-in user shown the sign-in form at `/login` (looked like being signed out) | — | Redirect to the workspace; public header shows "My workspace" |
| Horizontal overflow on phones: new-invoice form, platform and support consoles | 34 views | `min-w-0`, wrapping headers |
| Sign-out button without accessible name (phones) | 195 views | `aria-label` |
| Scroll areas not reachable by keyboard; meters without names; contrast in console headers; link not distinguishable | 49 views | Focusable scroll regions, labelled meters, contrast and underline fixes |
| React hydration error on the home page (reduced motion read during render) | 3 views | Preference read after mount; CSS shows fade-in sections at once with reduced motion |

**Round 2 (after fixes, same crawl): 717 page views — 0 HTTP errors, 0 overflow, 0 console errors, 0 untranslated strings, 0 serious axe violations.**

**Added because the pilot needs it:** customer import from Excel/CSV (onboarding blocker), "Needs attention" strip on the dashboard (supplies to reorder, supplier invoices to pay), sign-out wipes offline driver data with nothing left to send.

**Data protection (SECURITY.md §Database and data protection):** citizens' name and contact encrypted at rest (AES-256-GCM, migration script for older rows); least-privilege database role for the application — verified that TRUNCATE, ALTER (disabling the append-only triggers), DROP, CREATE and changes to migration history are refused, and that the whole application works under that role; backups encrypted with `age`, plain dumps refused by default, restore drill from an encrypted backup passed. Random ids in URLs kept, per OWASP's IDOR guidance (access is checked on every request; encrypting ids is advised against). Next layer planned: PostgreSQL row-level security.
