# Roadmap

| Phase | Status | Content |
|-------|--------|---------|
| 0 Discovery | ✅ | Environment, tools, prototype inventory (see PROJECT.md §Phase 0 report) |
| 1 Research | 🟡 first pass | Sources register, dossier, competitor matrix; **no interviews yet** |
| 2 Product definition | ✅ v1 | Personas, journeys, MVP scope, acceptance criteria |
| 3 Business validation | 🟡 | Pricing hypotheses, scenarios, interview guide; validation pending |
| 4 Design | ✅ v1 | Tokens, components, RTL rules, a11y checks, screenshots |
| 5 Architecture | ✅ | Data model, tenancy, permissions, contracts |
| 6 Business MVP | ✅ | Auth, workspaces, customers, contracts, requests, work orders, field evidence |
| 7 Commercial ops | ✅ core | Fleet, invoicing, payments, reports. Missing: quotations, credit notes, PDF |
| 8 Civic pilot | ✅ core | Reports, verification, duplicates, assignment, map, analytics. Missing: contractor assignment, SMS |
| 9 Hardening | ⏳ next | See below |
| 10 Launch | ⏳ | Pilots → paid conversion |

## Done in v2 (2026-10-31)

Redesign ("Kerbside"), recurring schedules, container tracking, ops map, route sheet, command palette, 14-day trend, accent-insensitive search.

## Done in round 3 (2026-10-31)

Overview dashboard rebuilt with validated charts; server-side tables (search, sort, filters, pagination, Excel/CSV) on customers, work orders, invoices, containers; receivables aging; monthly collection certificate (staff and portal); online payment adapter (Chargily, test mode); remote support (tickets, customer-granted read-only access, staff console, audit); optional AI suggestions (civic triage, operations brief); shared rate limiter, login lockout, nonce CSP.

## Next milestone (M2): pilot-ready hardening — acceptance tests

1. Email delivery for invitations, password reset and citizen updates via the outbox worker (test: outbox rows → sent, retries idempotent).
2. S3-compatible `StorageProvider` (test: upload/download/authorization unchanged).
3. ~~Shared rate limiter~~ ✅ · 4. ~~Nonce-based CSP~~ ✅ (round 3).
4b. Chargily: run against a real **test** account, then owner decision on live mode and merchant contract.
4c. AI: build a small eval set (Arabic/French citizen reports) before enabling for customers; owner decision.
5. Nightly automatic schedule generation + public-holiday calendar (generation itself is done).
6. Invoice PDF in the validated legal format (after accountant review).
7. axe on authenticated pages + Arabic screen-reader pass.
8. CSV import of customers/locations for onboarding.

## Later

- Contractor assignment: municipality → provider tenant work orders with SLA reporting.
- Quotations and credit notes; live online payments (after merchant onboarding and owner approval).
- Offline-tolerant field app (PWA queue).
- NEXVO Market — gated on evidence of supply, buyer demand, material specs and a settlement model.
- Eco Points — gated on an approved, costed, abuse-resistant policy.
