# Design system

## Brand direction — "Kerbside" (v2, 2026-10-31)

Redesigned following Anthropic's official `frontend-design` skill (`.claude/skills/frontend-design`). v1 had the generic tells that skill lists: Inter, a green-on-white SaaS card kit with the same shadow on every box, tracked uppercase labels, "A · B" meta strings, an arrow on the CTA, and decorative numbering.

**Pass 1 (plan, grounded in the subject).** Subject: private waste collection in Algeria. Its vernacular is hi-vis vests, skip containers, truck livery, road signage, the route sheet and the weighbridge ticket. Audience: owners and dispatchers at a desk, and drivers on a phone in the sun. Primary job: see today's rounds and what is billable.

| Role | Name | Hex |
|------|------|-----|
| Structure, headings, nav rail | Asphalt | #1d2a2e |
| Page | Concrete | #edefed |
| Surfaces | Paper | #ffffff |
| Primary action, "done" | Skip green | #1f5a44 |
| Route signature, today, active marker, focus | Hi-vis | #e8590c (graphics only; text-safe variant #b8460a) |
| Muted text | Kerb grey | #566468 |

Type: **Archivo** (variable width), with headings at 72–80% width (the voice of truck livery and road signs) and body at 100%. **Noto Kufi Arabic** for Arabic, a geometric Kufi with the same signage spirit, at line-height 1.75.

Layout: a dark asphalt rail with a hi-vis bar on the active item. Content sits on concrete. Pages are made of white sheets with a 1px border and no shadow. Metrics live in one divided strip (`MetricStrip`) rather than four identical cards. The radius varies by hierarchy: 6px for controls, 10px for sheets, full for chips.

Principle: **spend the boldness in one place — the route line.** It appears in the hero (an animated round), the "request → paid invoice" stations, the dispatch team strips, the ops map polylines, the logo mark and the active nav marker. Everything else stays quiet.

**Pass 2 (review against defaults).** A generic "waste SaaS" prompt lands on green + leaf icons + white cards, which is what v1 was, so that was replaced. Asphalt plus one bright accent risks the "near-black + acid accent" default. It is mitigated by keeping the canvas light (concrete/paper), using orange only for the route, and keeping actions in skip green. Numbered markers appear only for true sequences (route stops, the five workflow stages).

Removed across the app: uppercase eyebrow labels, middle-dot meta strings (replaced by commas or separate elements), the CTA arrow, identical shadowed cards, and the icon-box feature grid.

Logo: an asphalt tile with a route-shaped "N" ending in a hi-vis depot dot. The wordmark "Nexvo" is set in Archivo condensed.

## Typography scale

Page title 28px Archivo 80% width, bold. Section title 17px bold. Body 14–16px. Metrics 32px condensed bold. Marketing H1 42–70px at 72% width. Numbers use `tabular-nums`.

## Components (`components/ui`)

| Component | Notes |
|-----------|-------|
| `Button`, `ButtonLink`, `buttonClass` | primary, secondary, subtle, ghost, danger; sm/md/lg (lg = 48px for field use) |
| `ActionForm`, `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `SubmitButton` | server-action forms; error summary with `role="alert"` receives focus; per-field messages linked via `aria-describedby`; pending state on submit |
| `Card`, `CardHeader`, `CardBody` | border-only sheets, no shadow |
| `MetricStrip` + `Stat` | one divided instrument panel |
| `TrendChart` | stacked daily bars, SVG decorative + sr-only data table, today marked in hi-vis |
| `RouteHero` | homepage round illustration; one orchestrated load sequence; reduced-motion shows final state |
| `CommandPalette` | Ctrl/⌘+K, native `<dialog>`, combobox/listbox ARIA, arrow-key navigation |
| `Badge`, `StatusBadge` | status = text + dot (never colour only); one tone map for all entities |
| `Table`, `Th`, `Td` | semantic table, `scope=col`, start-aligned, numeric columns end-aligned, horizontal scroll on mobile |
| `PageHeader`, `Stat`, `DescriptionList`, `EmptyState`, `Forbidden` | |
| `InlineAction`, `Disclosure` | one-button actions; native `<details>` for progressive disclosure |
| `BarList` | accessible bar chart: values as text, bars decorative, logical `inline-size` |
| `LeafletMap`, `LocationPicker` | map + manual coordinates + "use my location"; coordinates are always typable |

## States

- **Loading:** submit buttons show "Working…" and are disabled; map shows a skeleton.
- **Empty:** `EmptyState` with next step (e.g. onboarding checklist on the dashboard).
- **Error:** translated domain error at top of the form + field-level messages; unexpected errors are generic (no stack traces).
- **Success:** redirect to the created record, or inline `role="status"` message.
- **Forbidden:** server-rendered message; never just a hidden link.

## RTL and localization rules

1. `<html lang dir>` set per locale; Arabic uses IBM Plex Sans Arabic.
2. Only logical utilities: `ms-/me-/ps-/pe-/start-/end-/text-start/border-s`; directional icons get `rtl:rotate-180`.
3. Identifiers, plates, NIF, amounts, coordinates use `.num` (`direction: ltr; unicode-bidi: isolate`) so "WO-00042" or "00001-120-31" never reorder inside Arabic text.
4. Inputs for codes, phones, emails and coordinates use `dir="ltr"`.
5. Dates/numbers/currency through `Intl` with `ar-DZ` (Latin digits, as used in Algeria), `fr-DZ`, `en-GB`.
6. Leaflet container forced LTR (its controls are not RTL-aware); labels around the map are localized.
7. No hard-coded UI text: dictionaries in `lib/i18n/dictionaries`, fr/ar typed against en (missing keys fail the build).

## Responsive behaviour

Sidebar ≥1024px, hamburger menu below (includes language switcher). Field worker home is a card list; work-order actions are 48px buttons at the top; camera capture via `capture="environment"`. Tested: no horizontal overflow at 360px on public pages (all locales).

## Accessibility checklist

- [x] Skip link, landmarks (`header`, `nav`, `main`), one H1 per page
- [x] Visible focus ring (2px brand-600)
- [x] Labels for every control; errors announced and linked
- [x] Status not by colour alone
- [x] Contrast AA (axe on public pages, 3 locales)
- [x] `prefers-reduced-motion` respected
- [ ] Manual screen-reader pass (NVDA + TalkBack in Arabic) — not done yet
- [ ] axe on authenticated pages — not automated yet

## Data visualisation (2026-10-31)

Method: Anthropic's `dataviz` skill (form first, colour last, validator run, mark specs, hover layer, accessibility pass).

| Job | Colours | Validation (`validate_palette.js --mode light` on #ffffff) |
|-----|---------|-------------|
| Completed vs failed (stacked) | `#2a78d6` / `#d03b3b` | PASS, CVD ΔE 23.8. The earlier green/orange pair failed (ΔE 6.0) and was replaced |
| Single series (bars, meters) | `#2a78d6`; track `#dbe7f6` | — |
| Receivables aging (ordinal) | `#ee9a5c` → `#d9692f` → `#a8431a` → `#6e2a10`; "not due" grey `#a7b1b0` | one hue, light → dark |

Rules applied: columns ≤ 24 px with 4 px rounded data end and 2 px gaps between stacked segments; hairline gridlines and the maximum labelled; legend for ≥ 2 series; values and labels in ink tokens, never series colours; every column is a focusable button with a tooltip and an accessible name; every chart has a "show as table" toggle; no dual axes; status colours are not reused for series. Components: `components/charts/` (`ColumnChart`, `RankedBars`, `Meter`, `Legend`, `DataTableToggle`). Dashboard order follows common KPI-dashboard guidance (S-69–S-72): today's headline first, then trends, breakdowns, money, assets.

## Tables

Server-side search, sort and pagination with URL state (shareable, back-button safe); sortable headers expose `aria-sort`; filter chips; page sizes 25/50/100; results count; Excel and CSV download of the same data; sticky header with a scroll container on long tables; empty state distinguishes "no data" from "no match".

## Bidirectional text

Mixed Arabic/Latin fragments (names, dates, amounts) are isolated with `<bdi>` or U+2068/U+2069. `.num` (LTR, tabular) is for Latin-only codes and numbers; never put it on a formatted Arabic date.

## Home page motion and imagery (2026-10-31)

Requested references: Skiper UI, Vengeance UI, Animmaster Lib. None was used as code: two are paid (purchase needs owner approval), their sites are blocked from this environment, and Skiper's free tier requires attribution. The home page applies the same patterns with our own components on `motion` (MIT): scroll reveal (`components/home/reveal.tsx`), pointer spotlight cards, a product tour with keyboard-accessible tabs and a shared-layout pill, an animated sensor illustration and a capability marquee. Every component is static under `prefers-reduced-motion`, RTL-aware and CSP-compatible (inline style attributes only).

Images: real product screenshots (synthetic demo data) per locale in `public/showcase/` (regenerate with `node scripts/showcase-shots.mjs`), served through `next/image`; illustrations are hand-made SVG. No stock photos, no AI-generated "customer" imagery, and the sample assistant exchange is labelled as an example.

## Screenshots

`docs/screenshots/` (generated by `node scripts/screenshots.mjs docs/screenshots` against seeded data). Map tiles appear grey in screenshots taken in the sandbox because the tile server was unreachable there.
