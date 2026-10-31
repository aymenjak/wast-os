# MCP tooling strategy

MCP servers are development-time tool integrations for agents. They are **not** part of NEXVO's runtime backend.

## Inventory in this environment (verified 2026-10-30)

| Server / tool | Publisher | Purpose | Access | Used in this milestone |
|---------------|-----------|---------|--------|------------------------|
| `github` MCP (`mcp__github__*`) | GitHub (connected by the environment) | PRs, issues, CI status for `aymenjak/wast-os` | Repo-scoped to `aymenjak/wast-os` | Not needed yet (push via git) |
| `claude-code-remote` | Anthropic | Session/trigger management | Session-scoped | No |
| `claude-artifacts`, `Claude_Docs` | Anthropic | Publishing pages/docs | Owner-private by default | No |
| Web search tool | Anthropic | Research (SOURCES.md) | Read-only | **Yes** |
| Playwright (library, not MCP) | Microsoft; Chromium pre-installed | Screenshots, E2E, axe | Local | **Yes** |

No database, design-tool or documentation MCP server is installed. None was added.

## Recommended additions (evaluate before installing)

| Candidate | Why | Least-privilege setup | Fallback |
|-----------|-----|-----------------------|----------|
| Postgres MCP (read-only) | Let agents inspect dev schema/data | Connect only to `nexvo_dev` with a `SELECT`-only role; never production | `psql` + `prisma studio` |
| Playwright MCP | Interactive visual QA | Local browser only, no credentials beyond seed users | `scripts/screenshots.mjs`, Playwright tests |
| Official docs MCP (Next.js/Prisma) | Version-accurate docs | Read-only | Bundled docs in `node_modules/next/dist/docs`, Prisma skills |

For each: confirm the publisher and official repository, review exposed tools and permissions, test connectivity, and document the configuration using the client's actual schema (see https://docs.anthropic.com/en/docs/mcp and https://docs.anthropic.com/en/docs/claude-code/cli-usage). Destructive or external actions require approval.
