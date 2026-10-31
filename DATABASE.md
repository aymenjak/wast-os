# Database

Source of truth: `prisma/schema.prisma` + `prisma/migrations/`. PostgreSQL 16 with `postgis` and `citext`.

## Entity overview

```
User ─< Session
User ─< Membership >─ Organization ─┬─ Subscription >─ Plan
                                    ├─< Invitation
                                    ├─< Customer ─┬─< CustomerContact
                                    │             ├─< ServiceLocation (geog)
                                    │             ├─< CustomerNote
                                    │             └─< Contract ─< ContractServiceLine >─ WasteCategory
                                    ├─< CollectionRequest ── 1:1 ── WorkOrder
                                    ├─< Team ─< TeamMember >─ Membership
                                    ├─< Vehicle ─< VehicleMaintenance
                                    ├─< WorkOrder ─┬─< WeightTicket
                                    │              ├─< EvidenceFile
                                    │              └── 1:1 InvoiceLine
                                    ├─< Invoice ─┬─< InvoiceLine
                                    │            └─< Payment
                                    ├─< CivicReport (geog) ─┬─< CivicReportEvent
                                    │                        ├─< EvidenceFile
                                    │                        └── 1:1 WorkOrder (CIVIC_INTERVENTION)
                                    ├─< Counter, AuditEvent, Notification (outbox)
PaymentWebhookEvent (provider, externalEventId) unique
```

## Integrity rules enforced by the database

| Rule | How |
|------|-----|
| Tenant consistency of relations | Composite FKs `(organizationId, xId) → (organizationId, id)` on all child tables |
| A work order is invoiced at most once | `InvoiceLine.workOrderId` UNIQUE |
| One work order per request / civic report | UNIQUE on `collectionRequestId`, `civicReportId` |
| No duplicate payments on retry | UNIQUE `(organizationId, idempotencyKey)` |
| No double processing of provider events | UNIQUE `(provider, externalEventId)` |
| Retry-safe citizen submission | UNIQUE `clientSubmissionId` |
| Money sanity | CHECK `Payment.amount > 0`, `0 ≤ Invoice.amountPaid ≤ total`, line quantity > 0, price ≥ 0 |
| Weight sanity | CHECK `gross ≥ tare ≥ 0` and `net = gross − tare` |
| Coordinates | CHECK lat ∈ [−90, 90], lng ∈ [−180, 180] |
| Work-order kind | CHECK collection ⇒ customer+location; civic ⇒ civic report |
| Geography | Trigger `nexvo_sync_geog` keeps `geog` in sync with lat/lng; GIST indexes |

## Conventions

- IDs: `cuid()` strings (not sequential, not guessable).
- Money: `DECIMAL(14,2)`; quantities `DECIMAL(12,3)`; tax rates in basis points (`Int`).
- Time: `timestamptz(3)` for instants; `DATE` for calendar days (scheduled date, due date) — formatted in UTC so the day never shifts.
- Emails: `citext` (case-insensitive uniqueness).
- Human numbers: per-org `Counter` (`CUS-0001`, `REQ-00001`, `WO-00001`, `INV-2026-00001`); invoice numbers assigned at issue, never reused (voided invoices keep theirs).

## Migrations

```bash
npx prisma migrate dev --name <change>      # development (creates + applies)
npx prisma migrate deploy                    # CI / production (applies pending only)
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script   # drift check (must be empty)
```

The init migration contains hand-written SQL after the generated part (extensions, trigger, CHECK constraints). After editing the schema, always run the drift check above — Prisma does not model triggers or CHECKs, and it must not try to drop them (verified: diff is empty).

Rollback policy: migrations are forward-only. To revert, write a new migration. Before any destructive migration in production: take a backup (`DEPLOYMENT.md` §4), test the migration on a restored copy, and get explicit approval.

## Rewards (Eco Points) — designed, not implemented

Not implemented because no costed, abuse-resistant policy has been approved. Intended design: `RewardPolicy` (budget, eligibility), `RewardLedger` (append-only, unique `(policyId, reportId)` for idempotent issuance, issued only on CONFIRMED reports after a cooling period), `Redemption` records, fraud signals (device/contact velocity, geographic clustering). A submitted report never earns points by itself.
