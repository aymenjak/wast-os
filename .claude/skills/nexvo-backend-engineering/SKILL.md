---
name: nexvo-backend-engineering
description: Implement NEXVO domain logic, services, validation, state transitions and database changes with Prisma 7/PostgreSQL. Use for any server-side change.
---
# NEXVO backend engineering

## Procedure
1. Pure rules go in `server/domain` (no I/O) with unit tests.
2. Service functions: `(ctx: OrgContext, input: unknown)` → `requirePermission` → `parse(zodSchema, input)` → `prisma.$transaction` → filter every query by `organizationId: ctx.org.id` → `audit(...)`.
3. Throw `DomainError` with an i18n key; add the message to all three dictionaries.
4. New tenant tables: add `organizationId`, `@@unique([organizationId, id])`, and composite FKs to parents.
5. Schema changes: `npx prisma migrate dev --name x`, then drift check `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` must be empty. Hand-written SQL (triggers, CHECKs) goes at the end of the migration.
6. Nested creates cannot set scalar FKs through composite relations → use `createMany` in the same transaction.
7. Money: `lib/money.ts` minor units; numbers from `Counter` via `nextNumber`.
8. Retryable operations need a unique idempotency key.

## Verification
`npm run test:integration` (real DB) including a cross-tenant case for every new read/write.
