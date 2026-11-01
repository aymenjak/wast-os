# NEXVO

Waste-operations SaaS for Algeria, in Arabic (RTL), French and English.

- **NEXVO Business** — for private collection companies: customers, service locations, contracts, collection requests, dispatch, field evidence (photos, weights), fleet, invoicing and payments, reports, customer portal, **recycling** (material per weight ticket, destinations, recovery rate, recovery certificates, décret 06-104 classification, special hazardous waste transports and declaration, **sorting yard**: purchases, bales with QR labels, stock, sales, mass balance — see `RECYCLING.md`).
- **NEXVO Civic** — for communes: anonymous citizen reports, verification with PostGIS duplicate detection, team assignment, public tracking, SLA analytics.

Status: **MVP milestone, not deployed.** Pilot-oriented; pricing and market figures are hypotheses (see `BUSINESS-MODEL.md`).

## Quick start (development)

Requirements: Node 22, PostgreSQL 16 with PostGIS 3.4 and citext.

```bash
cp .env.example .env            # adjust DATABASE_URL / TEST_DATABASE_URL
npm ci
npx prisma migrate dev          # creates schema, triggers, constraints
npm run db:seed                 # synthetic demo data (refuses in production)
npm run dev                     # http://localhost:3000 → /fr
```

Demo logins after seeding (synthetic): `owner@demo-collecte.test`, `dispatch@…`, `driver@…`, `finance@demo-collecte.test`, `civic@demo-apc.test`, `portal@demo-client.test` (customer portal), `support@nexvo.test` (NEXVO support console), `admin@nexvo.test` (platform owner console at `/fr/platform`) — password `nexvo-demo-2026`. Staff accounts use two-step verification: add the **public, synthetic** demo secret `NEXVODEMOTOTPSECRETAAAAAAAAAAAAA` to an authenticator app (demo only).

Platform owner: organizations, subscriptions, municipality verification, suspension, plans, staff roles, account disable/unlock and a global audit log at `/[locale]/platform`. First owner of a new deployment: `npm run platform:role -- <email> OWNER`.

Assistant screenshots: `docs/screenshots/assistant/` (taken in local demo mode: `AI_DEMO_PROVIDER=1` on localhost answers from real data with a keyword script, clearly bannered — not an AI model; regenerate with `node scripts/assistant-shots.mjs`).

Optional integrations (off unless configured, see `DEPLOYMENT.md`): Chargily online payment (`CHARGILY_SECRET_KEY`, test mode by default) and AI suggestions (`ANTHROPIC_API_KEY`).

All screens in Arabic: `docs/screenshots/ar/` (64 screens, all roles, desktop and mobile; regenerate with `node scripts/screenshots-ar.mjs`).

## Tests

```bash
npm run typecheck
npm run test:unit
npm run test:integration        # real Postgres+PostGIS test DB
npm run build && npm run test:e2e
```

Last recorded run (2026-10-31): 211 unit/integration tests and 41 E2E tests passing (details in `TEST-PLAN.md`).

## Documentation map

| Topic | File |
|-------|------|
| Project overview, Phase 0 report, status | `PROJECT.md` |
| Requirements, personas, acceptance criteria | `PRODUCT-REQUIREMENTS.md` |
| Research, sources, competitors | `RESEARCH-DOSSIER.md`, `SOURCES.md`, `COMPETITOR-ANALYSIS.md` |
| Business model and pricing | `BUSINESS-MODEL.md`, `PRICING-ASSUMPTIONS.md` |
| Architecture, database, API | `ARCHITECTURE.md`, `DATABASE.md`, `API-CONTRACTS.md` |
| Design system | `DESIGN-SYSTEM.md`, `docs/screenshots/` |
| Security, privacy, compliance | `SECURITY.md`, `PRIVACY-AND-COMPLIANCE.md` |
| Testing, deployment, roadmap, decisions | `TEST-PLAN.md`, `DEPLOYMENT.md`, `ROADMAP.md`, `DECISIONS.md` |
| Recycling: research, décret 06-104 notes, R1 module and R2/R3 plan | `RECYCLING.md` |
| Agent workflow, skills, MCP | `AGENTS.md`, `.claude/skills/`, `docs/skills/`, `docs/mcp/` |

The original Bolt-generated "Waste City OS" prototype is preserved, unmodified, in `archive/bolt-prototype/` (excluded from the build).
