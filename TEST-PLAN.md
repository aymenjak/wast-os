# Test plan

## Layers

| Layer | Tool | Location | Database | Command |
|-------|------|----------|----------|---------|
| Unit (domain, money, security primitives) | Vitest | `tests/unit` | none | `npm run test:unit` |
| Integration (services on real Postgres+PostGIS) | Vitest | `tests/integration` | `TEST_DATABASE_URL` (name must contain "test"; migrated + truncated automatically) | `npm run test:integration` |
| End-to-end (production build in Chromium) | Playwright + axe-core | `tests/e2e` | `TEST_DATABASE_URL` (reset in global setup) | `npm run build && npm run test:e2e` |
| Type safety | tsc (strict, `noUncheckedIndexedAccess`) | all | — | `npm run typecheck` |
| Dependencies | npm audit | — | — | `npm audit --omit=dev` |

## Acceptance scenario → evidence

| Scenario | Automated evidence |
|----------|--------------------|
| A Register, configure, invite | integration `business-flow` (plan limit, admin-grant rule, invitations); e2e `business.spec` A (incl. field worker blocked from invoices by URL) |
| B Customer → location → contract → request | integration B (PostGIS point check); e2e B |
| C Dispatch | integration C; e2e C |
| D Field evidence | integration D (team scoping, evidence required, content sniffing, EXIF removed); e2e D |
| E Invoice and payment | integration E (per-tonne pricing 2.45 t × 4,500 = 11,025.00 + 19% = 13,119.75; partial/full; overpay rejected; single invoicing); e2e E (UI amounts) |
| F Tenant isolation | integration `tenant-isolation` (lists, reads, writes, payments, DB FK); e2e F (404 pages, file API, export, anonymous) |
| G Citizen report lifecycle | integration `civic-flow` (idempotent submit, no PII, PostGIS duplicates, full timeline, dispute→reopen); e2e `civic.spec` (Arabic mobile submission → review → public tracking) |
| H Invalid transitions | unit `state-machines` (exhaustive terminal-state check); integration H |
| I Idempotent financial effects | integration `payments-idempotency` (retry, conflict, 3 concurrent payments, webhook replay ×5) |
| K Recurring schedules | unit `schedule.test.ts` (daily/weekly/biweekly/monthly, Fri–Sat off, contract bounds); integration `operations.test.ts` (idempotent generation, range limit, role, tenant, invoice price from own line); e2e `operations.spec.ts` |
| R Recycling R1 | unit `recovery`, `nomenclature`; integration `recycling` (7); e2e `recycling.spec` (4) |
| T Territory (R3) | integration `territory` (4); e2e `territory.spec` (3) |
| S Sorting yard (R2) | integration `yard` (6); e2e `yard.spec` (3) |
| O Offline driver mode | integration `field-offline` (9: bundle scope, full offline job replayed twice without duplicates and with phone times, 3 concurrent deliveries keep one ticket, refusals, clock bounds, malformed input, other team, cross-tenant, support/portal); e2e `field-offline.spec` (4: page and jobs open with network cut, job done offline sent once on reconnect, API header/origin/session checks, Arabic RTL at 390 px) |
| ST Stock & procurement | unit `stock` (7: average cost, rounding, empty exactly, low flag); integration `stock` (13: codes per tenant, average across receipts, no negative, 10 concurrent issues, corrections, purchase validation, void rules, paid once, report per vehicle/category, roles, cross-tenant, append-only, audit); e2e `stock.spec` (2) |
| IM Customer import | integration `customer-import` (7: CSV parsing with BOM/;/quotes, preview writes nothing, grouping by NIF into sites, existing customers skipped, all-or-nothing on errors with field names, Arabic headers, permission, tenant isolation) |
| PT Pricing terms | unit `pricing` (7: plain, graduated tiers, below first threshold/order, minimum, large values, percent rounding, tier validation); integration `pricing-terms` (6: tiers on a draft, minimum, percent + per-collection surcharges, monthly run, validation and roles, cross-tenant); browser check ar 390 px found and fixed a form bug (tier rows not rebuilt from flat keys, which cleared them) |
| MB Monthly billing | integration `monthly-billing` (5: preview content and reasons, run + idempotent rerun, next month and void release, unticked customers and roles, cross-tenant); browser check ar 390 px: run creates the draft, preview then empty |
| CS Collection slip / signature | integration `collection-signature` (6: record with audit hash and slip data, once/PNG only/crew only/status window, closed after portal confirmation, offline time + idempotent replay + bundle flag, data-URL decoding limits, cross-tenant sign/slip/file); e2e `field-offline` draws the signature offline and checks it is sent once |
| VD Vehicle documents | integration `fleet-documents` (5: renewal replaces, expired/maintenance alerts and order, retired excluded, date validation and roles, cross-tenant) |
| L Containers | integration (transitions, history, field-worker scope, cross-tenant location rejected); e2e (register + deliver) |
| M Command palette search | integration (tenant + permission scoping, accent-insensitive, LIKE wildcards literal); e2e (Ctrl+K → result → navigate) |
| J ar/fr/en desktop & mobile | e2e `i18n-a11y` (lang/dir, translated H1, axe WCAG 2.2 AA serious/critical = 0 on 6 public pages × 3 locales with reduced motion, no overflow at 360 px); screenshots in `docs/screenshots` reviewed |

## Recorded results (2026-11-01, pre-pilot review — see PILOT-READINESS.md)

| Suite | Result |
|-------|--------|
| `npm run test:unit` | **9 files, 57 tests passed** |
| `npm run test:integration` | **22 files, 199 tests passed** (new: `audit-trail.test.ts` 2 — newly audited operations, append-only trigger; `scale.test.ts` 1 — recycling, territory and work-order export over 35,000 tickets) |
| `npx playwright test` | **54 passed** |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Restore drill | clean (`scripts/ops/restore-drill.sh`), identical row counts, app smoke on the copy |
| Load | 40k work orders / 60k tickets: all pages < 0.8 s, exports < 3.3 s (after fixing HTTP 500) |
| Field test | Pixel 5 3G and iPhone 13 slow 3G, CPU ×4, Arabic: full job in 18.6 s / 38.4 s; 93 page views at 393 px without overflow |

Defects found and fixed: bind-parameter limit (HTTP 500 at scale); missing HSTS; 8 unaudited mutations; audit trail editable by the app role; restore printing errors (PostGIS); page sideways overflow on phones (grid min-width) incl. invoice amounts; job actions out of reach on phones; focus hidden under sticky header; slow photo upload (now compressed on device); 16 px checkboxes.

## Recorded results (2026-11-01, R3 territory)

| Suite | Result |
|-------|--------|
| `npm run test:unit` | **9 files, 57 tests passed** |
| `npm run test:integration` | **20 files, 196 tests passed** (new `territory.test.ts` 4: figures grouped by commune and wilaya with overall and material rates, untracked kept apart, ledger rows; other tenant empty, field worker refused; local target needs a year, admins only, clearable; campaigns: period validation, role, during vs same-length before restricted to commune + materials, planned status; drop-off points: unique name, material required, container at a customer refused (service and DB CHECK), fill shown, tenant isolation) |
| `npx playwright test` | **54 passed** (new `territory.spec` 3: container → drop-off point for glass; campaign running; territory empty state + local target saved + grade-B reference lines; Arabic drop-off page at 390 px without overflow) |
| Migration | `20261104100000_r3_territory` (2 tables, 5 columns, 4 CHECKs; no DROP) on dev/test/demo; drift empty |

Defects found in screenshot review and fixed: Arabic dates scrambled inside LTR blocks (RLM marks from Intl — now isolated per date; same fix on the hazardous authorisation list); campaign date inputs and container form cramped; local-target form hidden until data existed (now always available).

## Recorded results (2026-11-01, R2 sorting yard)

| Suite | Result |
|-------|--------|
| `npm run test:unit` | **9 files, 57 tests passed** |
| `npm run test:integration` | **19 files, 192 tests passed** (new `yard.test.ts` 6: own yard only for sorting centres; individual sellers keep no registration number; own collections (net − rejects) and purchases enter stock; tare ≥ gross refused; prices typed → exact totals in centimes; field worker and other tenant refused; paid once; void refused after baling; bales/rejects never below zero; broken bale returns weight; **3 concurrent bales on 100 kg → exactly one succeeds**; sale needs a price per material, refuses the own yard as buyer, refuses loose kg above stock and an already-sold bale; claim only after delivery and not above total; settlement; draft cancel returns bales; mass balance and estimated margin with claim spread by amount; report refused to field worker and other tenant) |
| `npx playwright test` | **51 passed** (new `yard.spec` 3: own yard + buyer → seller → voucher ACH-00001 at 25 DZD/kg = 2,500.00 → paid; bale above stock refused, bale made, QR label rendered; sale VTE-00001 delivered; report revenue 3,200.00; Arabic yard page at 390 px without overflow) |
| Migration | `20261104090000_r2_sorting_yard` (7 tables, 4 enums, 1 column, 8 CHECKs, 1 partial unique index; no DROP) on dev/test/demo; drift empty |

Defects found in screenshot review and fixed: seller phone number reversed by bidi on the voucher; bale form cramped in its card.

## Recorded results (2026-11-01, reception and treatment of hazardous transports)

| Suite | Result |
|-------|--------|
| `npm run test:unit` | **9 files, 57 tests passed** |
| `npm run test:integration` | **18 files, 186 tests passed** (`hazardous.test.ts` now 7: planned D/R code validated; refused > received refused; all refused → must be a refusal; partial refusal needs a reason; treatment confirmation — office only, valid D/R code, date between delivery and today, other tenant refused, single transition; DB CHECK refuses TREATED without evidence; declaration uses accepted quantity and confirmed operation: 1.2 t = 0.75 elimination + 0.45 recycling) |
| `npx playwright test` | **48 passed** (`hazardous.spec` confirms treatment D10 through the UI and shows the official label of the code) |
| Migrations | `20261103120000_haz_reception_treatment` (enum value + columns) and `20261103120100_haz_reception_checks` (CHECKs in a separate migration — PostgreSQL cannot use a new enum value in the transaction that adds it); dev/test/demo; drift empty |

Incident: PostgreSQL had stopped after a container restart and `migrate diff` produced an empty file; caught by the non-empty check before deploying, regenerated after `service postgresql start`.

## Recorded results (2026-11-01, authorisations and labels — arrêtés of 2 September 2013)

| Suite | Result |
|-------|--------|
| `npm run test:unit` | **9 files, 57 tests passed** |
| `npm run test:integration` | **18 files, 185 tests passed** (`hazardous.test.ts` now 6: authorisation scope — SD codes only, own vehicles only, period valid, admins only, duplicate number refused, expired refused, code not covered and vehicle not named refused, tenant isolation of the list; withdrawal blocks new transports and pickup of drafts) |
| `npx playwright test` | **48 passed** (`hazardous.spec` now creates a vehicle and records an authorisation through the UI, and checks one label per package with the annex header) |
| Migration | `20261103110000_haz_transport_authorisations` (new table, 3 columns on movements, 3 CHECK constraints; no DROP) on dev/test/demo; drift empty |

Defect found in screenshot review and fixed: authorisation date range reversed by bidi in Arabic (now an LTR block).

## Recorded results (2026-11-01, special hazardous waste — décrets 04-409, 05-315)

| Suite | Result |
|-------|--------|
| `npm run test:unit` | **9 files, 57 tests passed** |
| `npm run test:integration` | **18 files, 184 tests passed** (new `hazardous.test.ts` 5: no transport without a valid authorisation, expired refused, admins only set it; only SD codes (MA and S refused), only licensed consignees, cross-tenant reads/writes refused; labels before pickup, decontamination before delivery, refusal final, all steps audited; DB CHECK refuses a delivered row without decontamination; declaration pre-fill — code, designation, criteria, 0.75 t merged from ticket + unlinked transport, section C, portal own-customer only, other tenant and field worker refused) |
| `npx playwright test` | **48 passed** (new `hazardous.spec` 3: authorisation → licensed destination → transport with 06-104 designation; signatures in order, browser blocks delivery without decontamination **and keeps the typed name**; declaration page; Arabic transport page at 390 px without overflow) |
| Migration | `20261103100000_hazardous_movements` (new table + 2 CHECK constraints) on dev/test/demo; drift empty |

Defects found and fixed: React 19 form reset wiped user input after any server error (app-wide, `ActionForm` now restores it — D-61); status column clipped in the transports table; Arabic signature timestamps reversed by an LTR class (same pitfall as before).

## Recorded results (2026-11-01, law 25-02 alignment)

| Suite | Result |
|-------|--------|
| `npm run test:unit` | **9 files, 57 tests passed** (`recovery.test.ts` +3: anaerobic digestion / reuse-repair = material, energy recovery = valorisation tracked separately even for residual, incineration = disposal, organic outside biological treatment flagged) |
| `npm run test:integration` | **17 files, 179 tests passed** (`recycling.test.ts` +2: special waste refused without a licensed destination — category or per-ticket stream; energy share and organic indicator in the report; other tenant sees nothing) |
| `npx playwright test` | **45 passed** |
| `npx tsc --noEmit` / `npx next build` | 0 errors / success |
| Migration | `20261103090000_destination_kinds_law_25_02` (3 × `ALTER TYPE … ADD VALUE`, non-destructive) applied to dev, test and demo DBs; drift check empty |

## Recorded results (2026-11-01, recycling R1 + décret 06-104)

| Suite | Result |
|-------|--------|
| `npm run test:unit` | **9 files, 54 tests passed** (new: `recovery.test.ts` 5, `nomenclature.test.ts` 3) |
| `npm run test:integration` | **17 files, 177 tests passed** (new: `recycling.test.ts` 7 — destinations tenant-scoped/unique/admin-only, stream defaulted from category, foreign or inactive destination refused, rejects ≤ net and audited, recovered/disposed/untracked + rate from tickets only, cross-tenant and field-worker refusal, certificate per customer/month incl. portal scope, 06-104 code accepted only with a matching class) |
| `npx playwright test` | **45 passed** (new `recycling.spec` 4: destination, classification error then success, weight ticket with material + destination → 100 % rate → certificate, Arabic page at 390 px without horizontal overflow) |
| `npx tsc --noEmit` / `npx next build` | 0 errors / success |
| Seed | Run on a fresh scratch database (`nexvo_r1demo`); existing dev data not touched |

Nomenclature check: `scripts/nomenclature/parse-06-104.py` re-generates `lib/nomenclature-06-104.ts` byte-identically from `pdftotext -layout` of the JO; every section numbered 1..n without gaps; 2 rubrics whose class sits on a continuation line (9.1.2, 14.1.3 — both SD) fixed by hand after reading the page; 12 random annex III rows compared to the text.

Defects found in screenshot review and fixed: "06-104" rendered as "104-06" inside Arabic sentences (bidi; now an LTR isolate); "t 3,86" unit order in RTL; chart maximum shown in kg next to tonnes; inline rejects form overflowed the ticket table; certificate defaulting to an empty current month (screenshot taken for the previous month); hardcoded "Wilaya" label.

## Latest results (2026-11-06, system review, stock, import, data protection)

| Suite | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run test:unit` | 64 passed |
| `npm run test:integration` | 232 passed (new: `stock` 13, `customer-import` 7, `review-fixes` 4) |
| `npm run build && npm run test:e2e` | 60 passed (new: `stock.spec` 2) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Full-system crawl (9 roles × ar/fr/en, 390 px, axe on Arabic) | round 1: 27 HTTP errors, 34 overflows, 84 console errors, 244 serious axe findings → round 2: **0 / 0 / 0 / 0** (717 page views) |
| App under least-privilege DB role | sign-in, 5 pages, writes (stock item, ledger insert, audit), sign-out: pass; TRUNCATE/ALTER/DROP/CREATE refused |
| Encrypted backup drill (age) | backup refused without key; encrypted dump unreadable; restore with key OK |

Defects found by tests during this round and fixed: e2e a11y caught fade-in content sampled mid-animation with reduced motion (now shown at once via CSS); e2e caught that redirecting `/register` for signed-in users blocked registering a second company (redirect kept on `/login` only); the crawler caught the 500 on the sensors page and the finance-data leak on the customer page (see PILOT-READINESS.md, system review).

## Latest results (2026-11-01, offline driver mode)

| Suite | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run test:unit` | 57 passed |
| `npm run test:integration` | 208 passed (23 files; new `field-offline` 9) |
| `npm run build && npm run test:e2e` | 58 passed (new `field-offline.spec` 4) |

Measured by hand (production build, emulated Pixel 5, 400 ms latency, 0.4 Mb/s, CPU ×4, already signed in): `/ar/field` first opening 2.5 s, next openings 0.6 s, with the network cut 0.4 s. The first figure benefits from scripts already cached by the sign-in page; a cold first visit remains the 8 s measured in PILOT-READINESS.md §5. Defect found in screenshot review and fixed: status banners used colour shades that do not exist in the design tokens (invisible offline banner).

Not covered: real phones, iOS Safari (service worker and IndexedDB storage eviction behave differently), a phone switched off for days with a large outbox, storage quota exhaustion with many photos.

## Earlier results (2026-10-31, home page)

Vitest 211 passed, Playwright 41 passed (axe serious/critical = 0 and no horizontal overflow on the home page in ar/fr/en, reduced motion), build success, npm audit 0 (motion 14.9.0). Browser console: 0 errors on the home page after fixing the middleware redirect of `/showcase/*.jpg`.

## Recorded results (2026-10-31, fixes + AI assistant)

| Suite | Result |
|-------|--------|
| `npx vitest run` | **21 files, 211 tests passed** (3 consecutive runs of the new file) |
| `npx playwright test` | **41 passed** |
| `npx tsc --noEmit` / `npx next build` | 0 errors / success |
| `npm audit --omit=dev` | 0 vulnerabilities (playwright-core 1.63.0 added) |

`fixes-and-assistant.test.ts` (12): password reset (no enumeration, single use, old link invalidated, sessions/lockout cleared, body redacted, expiry); invitation email with redaction; citizen emails only for email contacts; real PDF (`%PDF-`) tenant/portal-scoped and attached to the email; retention; assistant opt-in, role/tenant-scoped tools, invalid input, private conversations, audit without content; **CLI smoke** (real `npm run retention:run` / `outbox:work`). E2E `reset-assistant.spec` (2). Visual check: Arabic invoice PDF rendered to PNG and reviewed (shaping and RTL correct).

Defects found and fixed: `npm run billing:run` crashed (shipped in the previous round) because shared modules import `server-only` — tests had hidden it; two order-dependent tests (same-millisecond emails) and one hydration race in an e2e test.

## Earlier results (2026-10-31, LoRaWAN, live vehicle map, email)

| Suite | Result |
|-------|--------|
| `npx vitest run` | **20 files, 199 tests passed** |
| `npx playwright test` | **39 passed** (3.4 min) |
| `npx tsc --noEmit` / `npx next build` | 0 errors / success |
| `npm audit --omit=dev` | 0 vulnerabilities (nodemailer 10.3.1) |

`lorawan-email-map.test.ts` (10): DevEUI normalisation and codec field mapping; provider-specific, revocable integration keys; ChirpStack v4 uplink (camelCase, `?event=up`, other events ignored, idempotent); TTN v3 uplink (snake_case, hex DevEUI) for a fill sensor (alert opened) and a GPS tracker; unknown device / missing fields / non-uplink handled; same DevEUI in another tenant untouched; live positions tenant-scoped, 24 h window, portal refused; invoice email escaped (no `<script>`/`<img>`), drafts/other tenants/roles refused, audited; outbox retries with backoff, no double send under 3 concurrent workers, failed after 5 attempts, waits without SMTP and is delivered later; billing emails owners/admins + organization address in its language (RTL for Arabic). E2E: real HTTP TTN webhook (401 without/with wrong-provider key, 202 unknown device, 200 ingested, fill alert closes at 35 %); invoice "Send by email" queues and audits.

Test-setup change: Vitest aliases the `server-only` guard to an empty module (`tests/helpers/server-only.ts`).

## Earlier results (2026-10-31, 2FA, subscription billing, per-organization payments, IoT)

| Suite | Result |
|-------|--------|
| `npx vitest run` | **19 files, 189 tests passed** |
| `npx playwright test` | **38 passed** (3.0 min) |
| `npx tsc --noEmit` / `npx next build` | 0 errors / success |
| `npm audit --omit=dev` | 0 vulnerabilities (after adding `qrcode`) |

New: `mfa.test.ts` (10), `totp-crypto.test.ts` (8, RFC 6238 vectors + AES-GCM tamper), `billing.test.ts` (13), `iot.test.ts` (12), `fill-forecast.test.ts` (4), Chargily tests extended (per-organization keys and webhooks). E2E `billing-iot.spec` (5): device registration → HTTPS ingest → alert; owner configures and runs billing → organization opens its invoice → payment recorded; user enables 2FA, wrong code refused, correct code signs in. Existing staff flows now enroll 2FA.

Defects found by tests and fixed: recovery codes vanished right after enabling 2FA (server refresh replaced the form — users would never have seen them); the Chargily money-routing error (D-37) found in design review; Arabic nav label mixing scripts; forecast text shown for a bin already above threshold.

## Earlier results (2026-10-31, platform owner console)

| Suite | Result |
|-------|--------|
| `npx vitest run` | **14 files, 140 tests passed** |
| `npx playwright test` | **33 passed** (1.2 min) |
| `npx tsc --noEmit` / `npx next build` | 0 errors / success |
| `npm audit --omit=dev` | 0 vulnerabilities |

`platform-console.test.ts` (16): tenant users and support agents refused everywhere; admins refused on plans/staff; disabled owner loses access; tenant search (name, member email, filters); detail exposes counts not records; subscription change audited in the tenant log; invalid plan refused; municipality verification; list-price revenue from ACTIVE only; suspension blocks live sessions, keeps data, refuses double suspension, reversible, audited; suspended municipality refuses citizen reports; plan update audited, negative price refused; role grant/removal, not self, unknown email, last owner protected; DB CHECK on role/flag; disable ends sessions and login, enable, unlock; admins cannot disable owners or themselves; global audit. E2E `platform-owner.spec` (5): 404 for tenant users, owner lands on console, changes plan, suspends, member sees the suspension message and is blocked, reactivation restores access.

Flaky test found and fixed: `platform.spec` matched the ticket title with `getByText`, which also hit Next.js's route announcer on some runs; it now targets the heading. One full run had 1 failure from this before the fix (that commit was pushed before the failure was noticed); the next full run was 33/33.

## Earlier results (2026-10-31, payments, remote support, AI, tables, documents, hardening)

| Suite | Result |
|-------|--------|
| `npx vitest run` | **13 files, 124 tests passed** |
| `npx playwright test` | **28 passed** (1.1 min) |
| `npx tsc --noEmit` | 0 errors |
| `npx next build` | success |
| `npm audit --omit=dev` | 0 vulnerabilities |

New evidence:

| Area | Tests |
|------|-------|
| Chargily online payment | `payments-chargily.test.ts` (14): checkout amount/URL/test mode, cross-tenant 404, portal scoped to own customer, role refusal, drafts refused, disabled without key, live mode needs https, signature exact/fail-closed, unsigned rejected, amount mismatch not applied + audited, unknown checkout ignored, concurrent replay → one payment, reconcile-required when already paid, failed status recorded |
| Remote support | `support-access.test.ts` (11) + e2e: tickets tenant-scoped, portal users refused, staff-only console (404 for others), no grant → no access, only admins grant, 1/4/24 h only, VIEWER context under staff identity, cannot self-extend, grant in A gives nothing in B, revoke/expiry/lost staff flag end the session, end audited; e2e: banner, no create buttons, export 403, revoke |
| AI assist | `ai-assist.test.ts` (7, fake provider): disabled without key, no reporter identity/coordinates in input (exact key list), never changes the report, tenant and role refusal, decision permission-checked and audited, refusal typed and nothing stored, brief gets aggregates only |
| Security primitives | `security-hardening.test.ts`: Postgres limiter (concurrency, per key, window reset, scale ignored off-localhost), lockout after 5 (even correct password), unlock + counter reset, unknown email same error |
| Tables | same file: cross-tenant, `%`/`_` literal, accent-insensitive names, every whitelisted sort × both directions on 4 tables, unknown sort ignored, page size clamped, pagination totals, permission |
| Documents | same file: CSV formula neutralised, XLSX is a zip with Arabic headers, export permissions, receivables aging buckets, certificate portal scoping and cross-tenant 404; e2e certificate page |
| CSP | e2e `platform.spec`: nonce + strict-dynamic, fresh nonce per request, `frame-ancestors 'none'`, no CSP console violations |

Defects found and fixed in this round: Prisma rejects `nulls: "last"` on non-nullable columns (containers and invoices tables crashed — caught by e2e, regression test added); new tables lost accent-insensitive search (caught by e2e); `recordAiDecision` lacked a permission check (review); revenue figures overlapped and mixed Arabic/Latin strings were mis-ordered on the dashboard, support log showed untranslated action names, `.num` (LTR) on Arabic dates reversed them (all found in screenshot review); rate-limit buckets now persist across restarts, so screenshot runs need `RATE_LIMIT_SCALE` on localhost.

## Earlier results (2026-10-31, after v2 redesign and operations features)

| Suite | Result |
|-------|--------|
| `npx vitest run` | **9 files, 76 tests passed** |
| `npx playwright test` | **22 passed** (52.7 s) |
| `npx tsc --noEmit` | 0 errors |
| `npx next build` | success |
| `npm audit --omit=dev` | 0 vulnerabilities |

Defects found by tests and fixed: search treated `%`/`_` as wildcards (Prisma `contains` does not escape) and was accent-sensitive (now `unaccent`); hero label wrapped in Arabic (screenshot review). Milestone 1 defects: Prisma nested-create with composite tenant FKs; contrast of `ink-500`/`ink-400` (axe); "today" computed in UTC instead of org timezone (surfaced by tests running after midnight in Algiers); overdue backlog ignoring assigned work.

## Not yet covered (honest gaps)

- axe on authenticated pages; manual screen-reader testing in Arabic.
- Chargily against a real test account (amount decimals, minimum amount, real webhook payloads) — only a fake HTTP layer was tested.
- AI with the real API (quality, Arabic output, latency) — only a fake provider was tested; no eval set yet.
- Load/performance tests; Lighthouse.
- Backup/restore drill (procedure in DEPLOYMENT.md, not executed).
- Browser matrix beyond Chromium (Firefox, WebKit/iOS Safari).
- Upload of very large / malformed images (fuzzing).
- Session expiry and sliding renewal timing tests.
