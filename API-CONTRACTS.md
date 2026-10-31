# API contracts

NEXVO's UI uses **server actions** that call the service layer; there is no public REST API yet. The contracts below are the stable boundaries: services (TypeScript), server actions (form fields) and HTTP route handlers.

## 1. Conventions

- Every service function takes `ctx: OrgContext` first (except public civic/auth functions) and `input: unknown` that it validates with Zod.
- Errors are `DomainError` with a code that is also an i18n key: `errors.notFound`, `errors.forbidden`, `errors.invalidTransition`, `errors.validation` (+ `details.fields`), and domain-specific codes (`errors.payment.exceedsBalance`, …). Codes are listed in `lib/i18n/dictionaries/en.ts → errors`.
- "Not found" is returned both for missing records and records of another tenant.

## 2. Service catalogue (server/services)

| Service | Function | Permission | Notes |
|---------|----------|------------|-------|
| accounts | `registerOrganization(input)` | public, rate-limited | creates user, org, owner membership, trial, categories, session |
| | `login(input)` / `logout(token)` | public, rate-limited | generic error on bad credentials |
| | `inviteMember(ctx, {email, role, customerId?})` | team.manage; ADMIN only by OWNER | returns one-time token; outbox email |
| | `acceptInvitation({token, name?, password})` | public | existing accounts must prove password |
| | `changeMemberRole`, `setMemberStatus`, `revokeInvitation` | team.manage | owner/self protected |
| | `updateOrganizationSettings(ctx, input)` | settings.manage | |
| customers | `listCustomers`, `getCustomer` | customers.read | |
| | `createCustomer`, `updateCustomer`, `addContact`, `addServiceLocation`, `addCustomerNote` | customers.write | plan limit on create |
| contracts | `listContracts`, `getContract`, `contractsDueForRenewal` | contracts.read | |
| | `createContract`, `setContractStatus` | contracts.write | status machine DRAFT→ACTIVE⇄SUSPENDED→TERMINATED, ACTIVE→EXPIRED→ACTIVE |
| requests | `listRequests` | requests.read or portal (own customer) | |
| | `createRequest` | requests.write or portal (customer forced) | date ≥ org-local today |
| | `validateRequest` (→ creates WorkOrder), `rejectRequest` | requests.validate | |
| work-orders | `listWorkOrders`, `getWorkOrder` | workorders.read (field: own teams; portal: own customer) | |
| | `assignWorkOrder` | workorders.dispatch | |
| | `transitionWorkOrder(action)` | dispatch: unassign/cancel/reschedule/resolveDispute/redo; execute (team member): start/complete/fail | syncs request & civic report |
| | `addEvidence`, `addWeightTicket` | execute (team member) | |
| | `customerFeedback` | portal | confirm / dispute |
| | `getEvidenceForDownload` | parent-record visibility | |
| fleet | vehicles, maintenance, teams, members | fleet.read / fleet.write | plan limit on vehicles |
| invoices | `listInvoices`, `getInvoice` | invoices.read or portal (non-draft, own customer) | |
| | `createDraftInvoice`, `addManualLine`, `removeLine`, `issueInvoice`, `voidInvoice` | invoices.write | |
| | `recordPayment`, `reverseRecordedPayment` | payments.record | idempotent, row-locked |
| | `processPaymentWebhook(provider, raw, sig, secret)` | HMAC | idempotent per event |
| civic | `submitCivicReport`, `getPublicReport`, `citizenFeedback`, `publicMapPoints`, `publicMunicipalities` | public | no PII returned |
| | `listCivicReports`, `getCivicReport`, `findPossibleDuplicates`, `civicAnalytics` | civic.read | |
| | `reviewCivicReport(ctx, id, {to, …})` | civic.review | ASSIGNED creates/reopens work order |
| reports | `businessDashboard`, `exportWorkOrdersCsv`, `exportInvoicesCsv` | reports.read (+ invoices.read) | |

## 3. HTTP endpoints

### `GET /api/health`
`200 {"status":"ok"}` or `503 {"status":"degraded"}` (DB unreachable).

### `GET /api/files/{evidenceId}`
Session cookie required. `200` with the file (`Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, sandbox CSP, PDFs as attachment). `404` for unauthenticated, other tenant, or invisible parent record.

### `GET /api/exports/{work-orders|invoices}?from=YYYY-MM-DD&to=YYYY-MM-DD`
Session required. UTF-8 CSV with BOM; cells starting with `= + - @` are prefixed with `'`. `400` bad dates, `401` no session, `403` missing permission. Each download is audited.

### `POST /api/webhooks/payments/{provider}`
Generic signed notification for a future payment gateway adapter.

Headers: `X-Nexvo-Signature: hex(HMAC-SHA256(rawBody, PAYMENT_WEBHOOK_SECRET))`

Body:
```json
{ "eventId": "evt_123", "type": "payment.succeeded", "organizationId": "…", "invoiceId": "…",
  "amount": "5900.00", "reference": "GATEWAY-REF", "paidAt": "2026-10-30" }
```
Responses: `200 {"ok":true,"duplicate":false}` (applied) · `200 {"ok":true,"duplicate":true}` (replay, no effect) · `401` bad signature · `422` validation/business rule (e.g. exceeds balance; transaction rolled back, provider may retry) · `413` body > 64 KB.

No real provider (SATIM/CIB/Edahabia gateway) is integrated; an adapter must verify the provider's own signature scheme and map fields before calling the service.
