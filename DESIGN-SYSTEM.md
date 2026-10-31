# Design system

## Brand direction

NEXVO should read as **operational infrastructure**: calm, legible, trustworthy, with a restrained environmental accent. No gradients-as-decoration, glassmorphism, oversized icons, fake logos, live-activity theatre or unsupported impact numbers. Patterns were studied from GOV.UK Design System (form errors, summary lists), Carbon (data tables, density), Material 3 (state layers) — identities were not copied.

Logo: a rounded square in brand-700 with a single-stroke "N" path ending in a light dot (a route reaching its stop). Wordmark: NEXVO, letter-spaced. Files: `components/ui/misc.tsx → Logo`, `public/icon.svg`.

## Tokens (`app/globals.css`, Tailwind v4 `@theme`)

| Token | Value | Use |
|-------|-------|-----|
| `ink-950 … ink-50` | #0b1513 → #f6f8f7 (green-tinted neutrals) | Text, surfaces, borders |
| `brand-900 … brand-50` | #063b33 → #edf8f5 (verdigris) | Primary actions, active nav, focus |
| `sand-600 / sand-100` | #9a5b13 / #fbefd9 | Highlights, access notes |
| `info/success/warning/danger-700/100` | blue / green / amber / red | Status badges, alerts |
| `--radius-control` 8px, `--radius-card` 12px | | |
| `--shadow-card`, `--shadow-pop` | subtle | Cards, popovers |
| Fonts | Inter Variable (Latin), IBM Plex Sans Arabic (Arabic, line-height 1.7) | self-hosted via @fontsource |

### Verified contrast (computed from token values, WCAG 2.x formula)

| Pair | Ratio |
|------|-------|
| ink-500 #5a6b65 on ink-50 | 5.28 |
| ink-500 on white | 5.64 |
| white on brand-700 | 7.80 |
| brand-700 on brand-50 | 7.18 |
| warning-700 on warning-100 | 5.06 |
| danger-700 on danger-100 | 5.30 |
| success-700 on success-100 | 4.57 |
| info-700 on info-100 | 5.49 |

`ink-500` was darkened from #65776f (4.45:1, failed axe) to #5a6b65. `ink-400` is no longer used for text.

## Typography scale

Page title 24px/600 · section title 15px/600 · body 14px · meta 12px · marketing H1 36–48px/600. Numbers use `tabular-nums`.

## Components (`components/ui`)

| Component | Notes |
|-----------|-------|
| `Button`, `ButtonLink`, `buttonClass` | primary, secondary, subtle, ghost, danger; sm/md/lg (lg = 48px for field use) |
| `ActionForm`, `Field`, `Input`, `Select`, `Textarea`, `Checkbox`, `SubmitButton` | server-action forms; error summary with `role="alert"` receives focus; per-field messages linked via `aria-describedby`; pending state on submit |
| `Card`, `CardHeader`, `CardBody` | |
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

## Screenshots

`docs/screenshots/` (generated by `node scripts/screenshots.mjs docs/screenshots` against seeded data). Map tiles appear grey in screenshots taken in the sandbox because the tile server was unreachable there.
