---
name: nexvo-frontend-engineering
description: Build NEXVO pages and components with Next.js 16 App Router, server actions, typed i18n dictionaries and RTL support. Use when adding or changing UI code.
---
# NEXVO frontend engineering

## Procedure
1. Pages are server components under `app/[locale]/…`; start with `const { locale, ctx, d } = await appPage(params)` and check `ctx.permissions` → render `<Forbidden>` if missing.
2. Load data only through `server/services/*`. Wrap detail loads in `orNotFound()`.
3. Mutations: add a `"use server"` action in `app/actions/*` using `orgAction(fd, (ctx, input) => service(ctx, input))`; client form uses `ActionForm` + `Field`.
4. Add strings to `lib/i18n/dictionaries/en.ts`, then fr and ar (build fails if missing). Arabic must be written, not machine-glossed.
5. Next 16 specifics: `params` is a Promise; middleware is `proxy.ts`; layouts must type `params.locale` as `string` and validate with `isLocale`.
6. Client components only for interaction; keep field pages light.

## Verification
`npm run typecheck`, `npx next build`, relevant Playwright spec; check the page in ar at 390px.
