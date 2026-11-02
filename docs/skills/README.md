# Agent skills

## Inventory (discovered 2026-10-30)

| Skill | Source | Used? |
|-------|--------|-------|
| Built-in Claude Code skills (code-review, security-review, simplify, run, dataviz, docs/pdf/xlsx…) | Anthropic, pre-installed in this environment | Available; not required for this milestone |
| Prisma official skills (`prisma-cli`, `prisma-client-api`, `prisma-database-setup`, `prisma-upgrade-v7`, …) | Published by Prisma, dropped by `prisma init` (`skills-lock.json` → `prisma/skills` on GitHub) | **Read** to confirm Prisma 7 adapter usage; not vendored into the repo (DECISIONS D-19) |
| Project skills `nexvo-*` (10) | This repository, `.claude/skills/<name>/SKILL.md` | Yes |
| `frontend-design` | Anthropic, [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design), Apache-2.0 (LICENSE.txt vendored) | **Yes — drove the v2 redesign** |
| `verification-before-completion` | Jesse Vincent, [obra/superpowers](https://github.com/obra/superpowers), MIT (LICENSE vendored) | Yes — no success claim without a fresh run |
| `systematic-debugging` | obra/superpowers, MIT | Yes — used for the search wildcard bug (root cause before fix) |
| `webapp-testing` | Anthropic | Reviewed, **not adopted**: it depends on bundled Python scripts to execute; the project already uses Playwright in TypeScript |

### Round 3 (2026-10-31): dashboards, documents, AI, tables, security, payments, support

| Need | Skill / source | Decision |
|------|----------------|----------|
| Overview dashboard, charts | `dataviz` (Anthropic, built in) | **Used.** Followed its procedure; ran `scripts/validate_palette.js` (old pair failed, new pair passes ΔE 23.8); mark specs, hover layer, table view (DESIGN-SYSTEM.md §Data visualisation) |
| AI integration | `claude-api` (Anthropic, built in) | **Used.** Current model id, structured output with Zod, server-side fallback, refusal and typed-error handling, timeouts/retries. AI stays optional and advisory |
| Reports and documents | `xlsx`, `pdf`, `docx` (Anthropic, built in) | Reviewed. They produce files in an agent session, not inside a web app. For in-app documents we used `write-excel-file` (XLSX, RTL), formula-safe CSV, and printable HTML (certificate, route sheet, invoice), which browsers print to PDF |
| Tables | TanStack Table skills (community, listed on skill indexes) | Reviewed, **not installed**: they target client-side tables; NEXVO keeps data server-side (tenant scoping, large lists). The useful practices were applied: URL state, sort whitelist, server pagination, `aria-sort`, debounce-free GET search, exports |
| Security / pentest | Trail of Bits [`trailofbits/skills`](https://github.com/trailofbits/skills) (CC BY-SA 4.0) | Read, **not installed** (plugin form with workflow scripts; trust policy forbids running third-party scripts unreviewed). Its `insecure-defaults` checklist was applied by hand (SECURITY.md §Insecure-defaults review), plus a manual review of the diff and a script that lists service functions lacking a permission check. The built-in `security-review` skill was not run this round |
| Online payment | No published Chargily skill found | Built from the official SDK source and API reference (S-73, S-74) |
| Remote support | No skill found | Built from documented vendor practice (S-75–S-79): customer grant, time limit, own identity, read-only, audit |

No new third-party skill was vendored in round 3.

### Round 4 (2026-10-31): illustrations

| Need | Skill / source | Decision |
|------|----------------|----------|
| Illustrations that "bring the system to life" | Anthropic [`canvas-design`](https://github.com/anthropics/skills/tree/main/skills/canvas-design) (Apache-2.0, instructions only, no scripts) and `algorithmic-art` (p5.js generative art) | `canvas-design` **vendored** (`.claude/skills/canvas-design`, licence included) as the method reference; it produces posters (PNG/PDF), not UI art. `algorithmic-art` not adopted (generative canvas art, not product illustration) |
| SVG/diagram skills | community `svg-illustration`, `technical-svg-diagrams` (listed on claudemarketplaces.com) | Not installed: technical diagrams, and `svg-illustration` was not found at the published path |
| Product illustration system | **new project skill `nexvo-illustration`** | Applies canvas-design's method (philosophy → craft → refinement pass) to inline SVG React components: palette tokens, geometry, RTL, a11y, motion and CSP rules, scene library |

## Project skills

| Skill | Responsibility |
|-------|----------------|
| `nexvo-product-strategy` | Scope, prioritization, acceptance criteria |
| `nexvo-research` | Primary sources, evidence grading, citations |
| `nexvo-business-model` | Pricing hypotheses, scenarios, sales |
| `nexvo-ui-ux` | Design system, states, accessibility |
| `nexvo-frontend-engineering` | Next.js 16 pages, server actions, i18n/RTL |
| `nexvo-backend-engineering` | Services, validation, transactions, migrations |
| `nexvo-gis` | PostGIS, maps, routing providers |
| `nexvo-security` | Per-change security checklist |
| `nexvo-testing` | Test layers, commands, evidence rules |
| `nexvo-release-readiness` | Release gates, migrations, backups |

Each skill references project documents instead of duplicating them. Trust policy: no third-party skill scripts are executed. External skills were downloaded from the publishers' GitHub repositories (not mirrors), read in full, checked for executable content (none), and vendored with their licences on 2026-10-31. Selection was based on web research: Anthropic's frontend-design skill is the most-cited design skill in 2026 roundups ([Tella](https://www.tella.com/blog/best-claude-code-skills), [DesignRevision](https://designrevision.com/blog/best-claude-code-skills)); Superpowers is the most-cited process bundle.
