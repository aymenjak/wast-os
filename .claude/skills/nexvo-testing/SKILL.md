---
name: nexvo-testing
description: Write and run NEXVO unit, integration (real PostGIS DB) and Playwright end-to-end tests including RTL and accessibility checks. Use whenever code changes or an acceptance scenario needs evidence.
---
# NEXVO testing

## Commands
- `npm run test:unit` — no DB.
- `npm run test:integration` — needs `TEST_DATABASE_URL` (DB name must contain "test"); migrations auto-applied, tables truncated per file via `resetDb()`.
- `npm run build && npm run test:e2e` — starts `next start -p 3100` against the test DB.

## Rules
1. Use helpers in `tests/helpers/db.ts` (`newOrg`, `addMember`, `isoDay` — org timezone!, `jpegWithExif`).
2. Each acceptance scenario keeps a row in `TEST-PLAN.md` pointing to its test.
3. Never mark a scenario done without a passing run; record results (counts, date) in TEST-PLAN.md.
4. Do not weaken assertions to make tests pass; fix the code or document the gap.
5. Synthetic data only.
