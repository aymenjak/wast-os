---
name: nexvo-illustration
description: Draw NEXVO's in-product illustrations (empty states, 404, auth, onboarding, success) as hand-built inline SVG React components in the "Kerbside line" style. Use when a screen needs an illustration or when adding a new scene. Adapts the canvas-design skill's method (philosophy first, craft, refinement pass) to UI.
---

# NEXVO illustration — "Kerbside line"

Method borrowed from Anthropic's `canvas-design` skill (vendored in `.claude/skills/canvas-design`, Apache-2.0): write the visual philosophy first, express it with restraint, then do a second refinement pass that removes rather than adds. Output here is **inline SVG in React**, not PNG/PDF.

## Philosophy

The city at 6 a.m., drawn by the crew that keeps it clean. Thick, confident ink lines (the asphalt colour) describe streets, bins, trucks and buildings as simple geometric solids; a single hi-vis orange line — the route — threads through every scene and always carries the meaning (where work goes next). Flat fills from the concrete and skip-green families sit under the ink like municipal paint. Nothing is decorative for its own sake: every element is something a collection crew would recognise. Scenes are calm, a little hopeful, never cute: no faces, no mascots, no stock-illustration people. Each drawing should look as if someone who loves both maps and machines spent hours aligning it to the pixel grid.

## Rules

- **Palette (tokens only):** ink `#1d2a2e`, concrete `#edefed` / `#d7dcda`, skip green `#1f5a44` / `#cfe3da`, hi-vis `#e8590c` (route and one accent per scene, never text), sky `#dbe7f6`, white. No gradients except one soft ground shadow.
- **Geometry:** viewBox `0 0 240 160` (wide scenes) or `0 0 160 160` (square). Ink stroke 3 px, `stroke-linecap="round"`, `stroke-linejoin="round"`; details 2 px. Snap coordinates to integers or .5.
- **Composition:** one subject, one route line, a ground line at y≈138; generous empty space; subject slightly off-centre toward the reading start (use `transform="scale(-1,1)"` mirroring only for directional subjects when the page is RTL — trucks drive toward the reading direction).
- **Accessibility:** decorative by default (`aria-hidden`, `focusable="false"`); the text next to it carries the message. If an illustration conveys information, give it `role="img"` and a translated `aria-label`.
- **Motion:** optional and subtle (route dash drawing, a blinking sensor LED, a 1–2 px bob); must stop under `prefers-reduced-motion` (CSS `motion-safe:` utilities or `useReducedMotion`).
- **Never put a CSS animation on an element that has an SVG `transform`** (the CSS transform replaces it and the shape jumps to the origin): position with an outer `<g transform>`, animate an inner `<g>`. Review motion in the running app, not only in a static render.
- **CSP:** no external images, no `<foreignObject>`, no inline `<script>`; ids must be unique per instance (use `useId`).
- **Honesty:** illustrations never depict real customers, logos or data; they are clearly drawings.

## Scene library (`components/illustrations/`)

`customers` (building with a pin), `workOrders` (truck on a route), `invoices` (receipt stack with a check), `devices` (bin with sensor waves), `support` (life ring), `search` (magnifier over empty street), `notFound` (dead-end road sign), `auth` (sunrise street with depot), `done` (route ending at a flag). Add new scenes to the same registry and record them here.

## Refinement pass (do it every time)

Remove one element. Align every stroke end. Check the drawing at 64 px wide and in RTL. Check contrast of anything that carries meaning (≥ 3:1 against its background).
