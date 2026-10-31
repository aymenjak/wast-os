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
