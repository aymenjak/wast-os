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
| L Containers | integration (transitions, history, field-worker scope, cross-tenant location rejected); e2e (register + deliver) |
| M Command palette search | integration (tenant + permission scoping, accent-insensitive, LIKE wildcards literal); e2e (Ctrl+K → result → navigate) |
| J ar/fr/en desktop & mobile | e2e `i18n-a11y` (lang/dir, translated H1, axe WCAG 2.2 AA serious/critical = 0 on 6 public pages × 3 locales with reduced motion, no overflow at 360 px); screenshots in `docs/screenshots` reviewed |

## Recorded results (2026-10-31, payments, remote support, AI, tables, documents, hardening)

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
