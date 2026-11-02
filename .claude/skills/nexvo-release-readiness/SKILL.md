---
name: nexvo-release-readiness
description: Check deployment, migrations, backups, monitoring, documentation and release gates for NEXVO. Use before tagging a release or touching production.
---
# NEXVO release readiness

## Procedure
1. Walk the gates in `DEPLOYMENT.md` §5; every unchecked gate blocks production.
2. Run the full pipeline (typecheck, unit, integration, build, e2e, `npm audit --omit=dev`).
3. Migrations: drift check empty; destructive changes rehearsed on a restored backup.
4. Confirm env vars; test-only switches absent.
5. Update `TEST-PLAN.md` results, `ROADMAP.md`, `DECISIONS.md`.

## Constraints
Production deployments, DNS, purchases and external communications require explicit approval from the project owner.
