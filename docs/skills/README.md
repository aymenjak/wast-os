# Agent skills

## Inventory (discovered 2026-10-30)

| Skill | Source | Used? |
|-------|--------|-------|
| Built-in Claude Code skills (code-review, security-review, simplify, run, dataviz, docs/pdf/xlsx…) | Anthropic, pre-installed in this environment | Available; not required for this milestone |
| Prisma official skills (`prisma-cli`, `prisma-client-api`, `prisma-database-setup`, `prisma-upgrade-v7`, …) | Published by Prisma, dropped by `prisma init` (`skills-lock.json` → `prisma/skills` on GitHub) | **Read** to confirm Prisma 7 adapter usage; not vendored into the repo (DECISIONS D-19) |
| Project skills `nexvo-*` (10) | This repository, `.claude/skills/<name>/SKILL.md` | Yes |

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

Each skill references project documents instead of duplicating them. Trust policy: no third-party skill scripts are executed; external skills are read, and only adopted after review of their source.
