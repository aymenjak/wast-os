# Working agreement for agents (and humans)

## Ground rules

1. Inspect before changing: read `PROJECT.md`, `ROADMAP.md` and the relevant skill in `.claude/skills/`.
2. Never claim an operation, test result, source or deployment that was not actually executed and verified.
3. Never fabricate citations, prices, market sizes, testimonials, logos or impact numbers.
4. Business logic lives in `server/domain` and `server/services`; pages and actions stay thin.
5. Every tenant query filters on `ctx.org.id`; every new read/write gets a cross-tenant test.
6. All UI text goes through `lib/i18n/dictionaries` (en → fr → ar). Check Arabic RTL at mobile width.
7. Synthetic data only. Never commit `.env` or real secrets.
8. Ask the project owner before: production deployments, destructive migrations, purchases, external communications, changing payment or legal behaviour.

## Definition of done

Workflow exists · authorization server-side · input/error states handled · tests pass and results recorded in `TEST-PLAN.md` · design system followed · ar/fr/en work · docs updated · verified in a running build.

## Commands

```bash
npm run typecheck && npm run test:unit && npm run test:integration
npm run build && npm run test:e2e
npx prisma migrate dev --name <change>   # then the drift check in DATABASE.md
node scripts/screenshots.mjs docs/screenshots   # needs `npm start` on :3000 with seed data
```

## Skills

See `docs/skills/README.md`. Use `nexvo-security` and `nexvo-testing` on every change; `nexvo-research` for any external claim.
