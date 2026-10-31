# Decision log

Format: decision · reason · evidence (S = source, T = test, A = assumption) · status.

| ID | Date | Decision | Reason | Evidence | Status |
|----|------|----------|--------|----------|--------|
| D-01 | 2026-10-30 | Business engine first; Civic as pilot | Private collectors can buy quickly; municipal procurement is slow | S-10, S-26, H1–H5 | Active |
| D-02 | 2026-10-30 | Civic sold through pilots, revenue assumed 0 | Law 23-12 procedures, unknown cycles | S-26 | Active |
| D-03 | 2026-10-30 | Archive the Bolt prototype instead of extending it | Mock data only, Next 13.5.1 (old, unmaintained line), no backend/tests; the brief asked to build from zero. Preserved at `archive/bolt-prototype/` and in git history (commit f371293) | repo inspection | Done |
| D-04 | 2026-10-30 | Next.js 16 + Prisma 7.10 (stable) + Postgres 16/PostGIS 3.4 | Stable releases; Prisma 8 is RC → excluded per "stable by default" | npm dist-tags | Active |
| D-05 | 2026-10-30 | Own session auth (scrypt, hashed tokens) instead of an auth SaaS/library | Small, auditable surface; no external dependency or data transfer; meets OWASP storage guidance | S-63, T unit | Revisit when SSO/2FA needed |
| D-06 | 2026-10-30 | No online payments in MVP; manual recording + signed webhook interface | Few certified merchants, certification needed | S-40, S-41, T payments | Active |
| D-07 | 2026-10-30 | Hazardous/special waste flagged but no hazardous workflow | Separate regulatory regime; avoid implying compliance | S-20, S-23 | Active |
| D-08 | 2026-10-30 | Map tiles configurable; no geocoder; coordinates via map/GPS/typing | OSMF policies; unknown Algerian address coverage | S-60, S-61 | Active |
| D-09 | 2026-10-30 | Wilaya/commune as free text with suggestions | 2026 reform to 69 wilayas | S-28 | Active |
| D-10 | 2026-10-30 | Composite tenant FKs `(organizationId, id)` | Defence in depth against IDOR bugs | T tenant-isolation | Active |
| D-11 | 2026-10-30 | Money in integer minor units in code, DECIMAL in DB; tax per line | Exactness; printed totals = sum of lines | T money | Active |
| D-12 | 2026-10-30 | Civic RESOLVED only via work-order completion with evidence | Prevents "closing" without field proof; no AI/automation can resolve or reject | T state-machines | Active |
| D-13 | 2026-10-30 | Duplicate detection = suggestion (75 m, same category, 14 days), human decides | Avoid false merges | T civic-flow | Active |
| D-14 | 2026-10-30 | Eco Points not implemented | No approved costed, abuse-resistant policy | brief §5 | Gated |
| D-15 | 2026-10-30 | Default locale fr; Accept-Language and cookie respected; ar-DZ with Latin digits | Business users largely French-literate; Algerian digit usage | Intl output check | Revisit after interviews |
| D-16 | 2026-10-30 | Pricing tiers 9,900 / 24,900 / 59,900 DZD (hypotheses) | Value anchor H1; cost floor A-13 | PRICING-ASSUMPTIONS | To validate |
| D-17 | 2026-10-31 | `ink-500` darkened to #5a6b65 | axe contrast failure 4.45:1 | T i18n-a11y | Done |
| D-18 | 2026-10-31 | "Today" always computed in the org timezone | Bug found when tests ran after midnight Algiers time | T business-flow | Done |
| D-19 | 2026-10-30 | Install vendor-published Prisma skills? — **No** for now | Prisma's `init` drops 10 skills; useful but large; project skills reference official docs instead | docs/skills | Revisit |
| D-20 | 2026-10-31 | Redesign v2 "Kerbside" using Anthropic's `frontend-design` skill | Owner feedback: the design looked generic/AI-made; the skill lists exactly the tells v1 had | DESIGN-SYSTEM.md, screenshots | Done |
| D-21 | 2026-10-31 | Vendor `frontend-design` (Apache-2.0) and two Superpowers skills (MIT); reject `webapp-testing` | Instruction-only skills are safe to adopt after reading; scripts are not executed | docs/skills | Done |
| D-22 | 2026-10-31 | Add recurring schedules, containers, ops map, route sheet, command palette | Core features in hauler software (route sheets, container tracking, recurring routes) per competitor research | S-56–S-58 | Done |
| D-23 | 2026-10-31 | Working week stored per organization, default Sun–Thu | Algerian weekend is Fri–Sat | — | Active |
| D-24 | 2026-10-31 | `unaccent`-based search via `nexvo_fold()` | French names with accents must match unaccented typing | T operations | Done |
