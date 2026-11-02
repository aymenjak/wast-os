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
| 9 Hardening | 🟡 | Pre-pilot review done (PILOT-READINESS.md); remaining items below |
| 10 Launch | ⏳ | Pilots → paid conversion |

## Done in v2 (2026-10-31)

Redesign ("Kerbside"), recurring schedules, container tracking, ops map, route sheet, command palette, 14-day trend, accent-insensitive search.

## Done in round 3 (2026-10-31)

Overview dashboard rebuilt with validated charts; server-side tables (search, sort, filters, pagination, Excel/CSV) on customers, work orders, invoices, containers; receivables aging; monthly collection certificate (staff and portal); online payment adapter (Chargily, test mode); remote support (tickets, customer-granted read-only access, staff console, audit); optional AI suggestions (civic triage, operations brief); shared rate limiter, login lockout, nonce CSP.

Platform owner console (organizations, subscriptions, verification, suspension, plans, staff, accounts, audit). Two-step verification (mandatory for staff). Automatic NEXVO subscription billing (off by default). Per-organization Chargily accounts. IoT: fill sensors, GPS trackers, alerts, fill forecast. LoRaWAN (ChirpStack v4, TTN v3). Live vehicles on the dispatch map. Invoice emails (outbox + SMTP).

## Done in round 4 (2026-11-01)

Recycling R1 (material and destination per weight ticket, recovery rate, recovery certificates, décret 06-104 classification, Law 25-02 destination kinds). Special hazardous waste (transport authorisations, movements under décret 04-409 with labels, reception and treatment, data for the décret 05-315 annual declaration). R2 sorting yard (suppliers and collectors, purchases, bales with QR labels, stock, sales, mass balance, margin). R3 territory (commune/wilaya reports against targets, drop-off points, sorting campaigns). Pre-pilot review (security scan, append-only audit trail, backup/restore drill, 40k-order load test, phone field test). Offline driver mode (IndexedDB outbox, idempotent sync, service worker). Public pages updated to describe these modules.

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

- Platform: accountant review of NEXVO invoice layout, email delivery of invoices and dunning reminders, CSV export of tenants, passkeys.
- IoT: GPS retention job, route replay, automatic collection proposals from forecasts (human-approved), MQTT for non-LoRa gateways.
- Accountant validation of the invoice PDF layout; streaming answers for the assistant; MQTT gateways.
- Contractor assignment: municipality → provider tenant work orders with SLA reporting.
- Quotations and credit notes; live online payments (after merchant onboarding and owner approval).
- Offline mode: wipe phone data on sign-out, iOS Safari check on real devices, background sync.
- NEXVO Market — gated on evidence of supply, buyer demand, material specs and a settlement model.
- Eco Points — gated on an approved, costed, abuse-resistant policy.
