# Project overview

## Mission

Turn fragmented waste operations into traceable, measurable and billable workflows — first for private collection companies (revenue engine), then for communes and citizens (civic engine).

## Phase 0 report (2026-10-30)

| Question | Finding |
|----------|---------|
| Tools & runtimes | Node 22.22, npm 10.9, pnpm, yarn, bun; Python 3.13; PostgreSQL 16.15 (local, was stopped); PostGIS 3.4 installed via apt; Docker CLI present but no daemon; Chromium + Playwright 1.63 pre-installed; outbound HTTPS via proxy (npm registry reachable) |
| Repository state | Not empty: a Bolt.new "Waste City OS" Next.js 13.5.1 prototype — ~2,000 lines of UI over `lib/mock-data.ts`, no backend, auth, database or tests. Preserved in `archive/bolt-prototype/` (D-03) |
| Skills | Anthropic built-ins; Prisma publishes official skills (seen via `prisma init`); no project skills existed → 10 created |
| MCP servers | GitHub (scoped to `aymenjak/wast-os`), claude-code-remote, artifacts/docs; no DB or design MCP (see `docs/mcp`) |
| Research capability | Web search available; primary legal texts (JO PDFs) not opened in this pass |
| Recommended architecture | Next.js 16 + Prisma 7.10 + PostgreSQL/PostGIS, single deployable, service layer with explicit tenancy (ARCHITECTURE.md) |
| Initial scope | Business end-to-end loop (request → work order → evidence → invoice → payment) + civic pilot loop |
| Main risks | No customer validation yet; legal formats (invoice, ANPDP) unverified; payment rails immature; municipal procurement slow; map/address coverage unknown |
| First milestone acceptance | Scenarios A–J in PRODUCT-REQUIREMENTS.md with automated evidence |

## Milestone 1 result

- Files: see git history (`0619d2a` domain + tests, `641abe0` UI + E2E, and the docs commit).
- Implemented: everything in the "In scope" column of PRODUCT-REQUIREMENTS.md §2.
- Tests executed: typecheck, 59 unit/integration, 19 E2E, production build, npm audit (TEST-PLAN.md).
- Known limitations: SECURITY.md "Known gaps", ARCHITECTURE.md §7, TEST-PLAN.md "Not yet covered".
- Remaining risks: RESEARCH-DOSSIER.md §5 open regulatory questions; zero interviews.
- Next milestone: M2 pilot-ready hardening (ROADMAP.md).

## Repository layout

```
app/                 Next.js routes ([locale] public site, /app, /portal, /api) and server actions
components/          Design-system and feature components
lib/                 i18n, money, generated Prisma client (git-ignored)
server/              domain logic, services, auth, storage, routing, infrastructure
prisma/              schema, migrations, seed (synthetic)
tests/               unit, integration, e2e
scripts/             screenshots, contrast check
.claude/skills/      project agent skills
docs/                skills, MCP notes, screenshots
archive/             preserved Bolt prototype
```
