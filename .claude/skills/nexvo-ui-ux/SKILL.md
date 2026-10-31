---
name: nexvo-ui-ux
description: Apply the NEXVO design system (tokens, components, states, accessibility, RTL). Use when designing or reviewing any screen or component.
---
# NEXVO UI/UX

## Procedure
1. Read `DESIGN-SYSTEM.md`. Use tokens from `app/globals.css` and components from `components/ui` — no ad-hoc colours.
2. Every screen defines loading, empty, error, success and forbidden states.
3. Status = text + dot via `StatusBadge`; never colour alone.
4. Use logical spacing (`ms/me/ps/pe/start/end`), `.num` for IDs/amounts, `rtl:rotate-180` for directional icons.
5. Field-worker screens: 48px primary actions, minimal typing, camera capture.
6. Regenerate screenshots: `node scripts/screenshots.mjs docs/screenshots` (server on :3000 with seed data).

## Verification
- `npx playwright test tests/e2e/i18n-a11y.spec.ts` passes (axe AA, no overflow at 360px).
- New text pairs checked ≥4.5:1 (see contrast table).
