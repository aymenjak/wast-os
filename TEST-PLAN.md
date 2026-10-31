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
| J ar/fr/en desktop & mobile | e2e `i18n-a11y` (lang/dir, translated H1, axe WCAG 2.2 AA serious/critical = 0 on 6 public pages × 3 locales, no overflow at 360 px); manual screenshots in `docs/screenshots` |

## Recorded results (2026-10-30/31, this environment)

| Suite | Result |
|-------|--------|
| `npx vitest run` | **7 files, 59 tests passed** |
| `npx playwright test` | **19 passed** (44.8 s) |
| `npx tsc --noEmit` | 0 errors |
| `npx next build` | success |
| `npm audit --omit=dev` | 0 vulnerabilities |

Defects found by tests and fixed during this milestone: Prisma nested-create with composite tenant FKs; contrast of `ink-500`/`ink-400` (axe); "today" computed in UTC instead of org timezone (surfaced by tests running after midnight in Algiers); overdue backlog ignoring assigned work.

## Not yet covered (honest gaps)

- axe on authenticated pages; manual screen-reader testing in Arabic.
- Load/performance tests; Lighthouse.
- Backup/restore drill (procedure in DEPLOYMENT.md, not executed).
- Browser matrix beyond Chromium (Firefox, WebKit/iOS Safari).
- Upload of very large / malformed images (fuzzing).
- Session expiry and sliding renewal timing tests.
