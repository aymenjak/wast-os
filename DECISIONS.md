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
| D-25 | 2026-10-31 | Online payment through Chargily Pay V2 hosted checkout (CIB/Edahabia), test mode by default; D-06 superseded for the adapter, **live mode needs owner approval** | Chargily is an Algerian gateway with a published SDK; hosted page keeps card data out of NEXVO | S-73, S-74, T payments-chargily | Active (test mode) |
| D-26 | 2026-10-31 | Webhook marks paid only when amount and currency equal the stored checkout; over-settlement → reconcile flag | Never trust metadata or the browser | T payments-chargily | Active |
| D-27 | 2026-10-31 | Remote support = customer-granted, time-limited, read-only access under the staff member's own identity; no "log in as" | Vendor practice (WorkOS, Ory, Tines, GoodData, Lightdash); accountability and consent | S-75–S-79, T support-access | Active |
| D-28 | 2026-10-31 | AI is optional (off without key), advisory only, minimised input; no automatic triage or decisions | D-12; privacy; prompt-injection risk in citizen text | T ai-assist, PRIVACY §6 | Active |
| D-29 | 2026-10-31 | Shared rate limiter and login lockout in Postgres; nonce CSP on all HTML (pages render dynamically) | Multi-instance safety; XSS defence in depth | T security-hardening, e2e platform | Done |
| D-30 | 2026-10-31 | Server-side tables with URL state instead of a client table library | Tenant scoping and large lists stay on the server; shareable views | T security-hardening | Done |
| D-31 | 2026-10-31 | XLSX via `write-excel-file`, not `exceljs` | `exceljs` dependency tree had advisories | npm audit | Done |
| D-32 | 2026-10-31 | Dashboard colours from the `dataviz` validator (blue/red pair, one-hue aging ramp) | Previous pair failed colour-vision-deficiency separation | DESIGN-SYSTEM.md | Done |
| D-33 | 2026-10-31 | Platform operator console with roles OWNER > ADMIN > SUPPORT | Owner needs full control of organizations, subscriptions, plans and staff from the product, not the database | T platform-console, e2e | Done |
| D-34 | 2026-10-31 | The operator controls accounts and metadata, not tenants' business records; reading those still needs the tenant's support grant | Customers' trust and data-protection role as processor (PRIVACY §9) | PRIVACY-AND-COMPLIANCE.md | Active — **owner may decide otherwise; would need legal review** |
| D-35 | 2026-10-31 | Suspension is reversible and keeps data; no deletion feature in the console | Deletion is destructive and has legal retention questions | — | Active; deletion = manual, approved procedure |
| D-36 | 2026-10-31 | TOTP 2FA, mandatory for platform staff, optional for others; implemented with Node `crypto` (RFC 6238 vectors tested), `qrcode` (MIT) for the QR only | Staff accounts can reach every tenant's metadata; no external auth service | T mfa, unit | Done |
| D-37 | 2026-10-31 | **Correction of D-25:** tenant invoices are paid into the tenant's OWN Chargily account (encrypted key per organization, per-organization webhook); the environment key is NEXVO's and only for subscription invoices | The first version routed every tenant's customer payments to one account — wrong money flow | T payments-chargily | Done |
| D-38 | 2026-10-31 | Automatic subscription billing with gapless numbering; off until the owner enters NEXVO's legal details; auto-suspension opt-in | Billing and suspension change legal/payment behaviour → owner decides (AGENTS rule 8) | T billing | Done (off by default) |
| D-39 | 2026-10-31 | Invoice layout for NEXVO's own invoices marked "to be validated by an accountant" | Algerian invoicing requirements not yet reviewed | — | Open |
| D-40 | 2026-10-31 | IoT over HTTPS JSON with per-device keys; no MQTT broker or LoRaWAN server bundled | Simplest secure path; gateways can forward HTTP | T iot | Active |
| D-41 | 2026-10-31 | Fill forecast = transparent linear trend since last emptying, not an LLM; AI brief receives only IoT counts | Explainable, cheap, testable; data minimisation | unit fill-forecast | Active |
| D-42 | 2026-10-31 | LoRaWAN via ChirpStack v4 HTTP integration and TTN v3 webhooks, one key per integration, devices matched by DevEUI | Formats verified in each project's source (docs sites unreachable here); one integration serves many devices | S-83, S-84, T lorawan | Done |
| D-43 | 2026-10-31 | Live vehicle map by 30-second polling of the latest fix, not WebSockets/SSE | Simple, works behind any proxy, enough for collection rounds | T positions | Done |
| D-44 | 2026-10-31 | Email through an outbox + SMTP (nodemailer); off until SMTP_URL is set; invoice content in the email body, no PDF attachment yet | Reliable (transactional), provider-agnostic; PDF waits for the validated legal layout | T email | Done (off by default) |
| D-45 | 2026-10-31 | Invoice PDF via headless Chromium (offline, JS off) instead of a PDF library | Correct Arabic shaping/RTL and the same layout as the print view; checked visually | T PDF, visual check | Done (optional, CHROMIUM_PATH) |
| D-46 | 2026-10-31 | AI assistant = read-only tool-using chat, per-organization opt-in, user-scoped tools | Useful answers from real data without granting the model any write power; data leaves only with the organization's consent | T assistant | Done (off by default) |
| D-47 | 2026-10-31 | Fixed: CLI scripts crashed on `server-only` imports (billing:run shipped broken in the previous round) | Tests aliased the guard; added a CLI smoke test that runs the real commands | T CLI smoke | Done |
