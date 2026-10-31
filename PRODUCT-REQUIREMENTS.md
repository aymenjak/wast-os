# Product requirements

## 1. Personas

| Persona | Org type | Role in app | Core job | Device |
|---------|----------|-------------|----------|--------|
| **Owner / manager** (Samir) | Collection company | OWNER / ADMIN | Win and keep B2B contracts, get paid, see performance | Laptop |
| **Dispatcher** (Nadia) | Collection company | DISPATCHER | Turn requests into a daily plan; react to failures | Laptop |
| **Driver / crew lead** (Yacine) | Collection company or commune | FIELD_WORKER | Know where to go, prove the job was done | Android phone, Arabic UI |
| **Accountant** (Leila) | Collection company | FINANCE | Invoice completed work, record payments, chase receivables | Laptop |
| **Customer facility manager** | Hotel/clinic/factory | CUSTOMER_PORTAL | Request pickups, check service, get invoices | Phone/laptop |
| **Municipal reviewer** | Commune (APC) | CIVIC_REVIEWER | Triage citizen reports, dispatch teams, report to elected officials | Laptop |
| **Citizen** | — | none (anonymous) | Report a problem, see it handled | Phone, often Arabic |

## 2. MVP scope (implemented in this milestone)

| Module | In scope | Out of scope (later) |
|--------|----------|----------------------|
| A. Organization & accounts | Self sign-up, trial plan, settings (NIF/NIS/RC, VAT, prefix, timezone), invitations with one-time links, roles, suspend, plan limits, multi-org switch | Branch/service-zone UI, SSO, 2FA, password reset by email (needs mail provider) |
| B. CRM | Customers, contacts, service locations with coordinates, conditions, notes | Import from CSV, duplicates merge |
| C. Contracts | Lines per location × category, price per collection/tonne/month, dates, renewal window, status machine, audit history | Recurring schedule auto-generation, document upload UI (model exists) |
| D. Requests | Staff and portal requests, validation → work order, rejection with reason | Recurring requests |
| E. Work orders | Lifecycle state machine, team+vehicle assignment, evidence photos (EXIF stripped), weight tickets, failure reasons, customer confirm/dispute, audit trail | Signature capture, offline mode |
| F. Fleet | Vehicles, status, maintenance/inspection log, teams and members | Fuel/costs analytics, telematics |
| G. Field ops | Dispatch board by day/team, overdue backlog, nearest-neighbour stop order, mobile work-order screen | Road routing, live GPS |
| H. Invoicing | Draft from completed work (contract price, weights), manual lines, issue with sequential number, void (if unpaid), payments (partial), reversals, idempotency, signed webhook endpoint | Quotations, credit notes (legal format TBD), PDF generation (print CSS used) |
| I. Reports | KPIs, completion rate, failures by reason, tonnage by category, vehicle use, receivables, renewals; CSV exports with formula-injection protection | Scheduled reports, charts over time |
| J. Portal | Requests, work-order list with confirm/dispute, invoices | Online payment |
| Civic | Anonymous report (photos, map/coordinates), tracking code, public timeline, confirm/dispute, verification queue, duplicate detection (PostGIS 75 m/14 days), assignment to municipal team (work order), SLA clock, analytics, coarse public map | Contractor assignment across tenants, Eco Points (policy not approved), SMS notifications |

## 3. User journeys and acceptance criteria

Each acceptance scenario maps to automated evidence (see TEST-PLAN.md).

| ID | Journey | Acceptance criteria | Evidence |
|----|---------|---------------------|----------|
| A | Register & invite | Org + owner + trial created; invitation link works once; field worker cannot see/open invoices; plan user limit enforced | `business-flow.test.ts` (A), `business.spec.ts` A |
| B | Customer → contract → request | Customer code auto-generated; location coordinates stored as PostGIS point; contract lines must use customer's own locations; request validated into a work order | integration B, e2e B |
| C | Dispatch | Team required; vehicles in maintenance rejected; board shows stop count | integration C, e2e C |
| D | Field execution | Only assigned team members (or dispatchers) can execute; completion requires ≥1 evidence file; non-images rejected by content sniffing; EXIF removed | integration D, e2e D |
| E | Invoice & payment | Lines priced from contract (incl. per-tonne from weights); a work order can be invoiced once; sequential number at issue; partial/complete payments; overpayment rejected; balance correct | integration E, e2e E |
| F | Tenant isolation | Other tenants get 404 for pages, files, exports; services return not-found; DB composite FKs block cross-tenant links | `tenant-isolation.test.ts`, e2e F |
| G | Citizen report lifecycle | Anonymous submission is idempotent; public view has no PII; reviewer verify/assign creates work order; field completion resolves; citizen confirms | `civic-flow.test.ts`, `civic.spec.ts` |
| H | Invalid transitions | Skipping review, manual RESOLVED, actions on terminal states, missing reasons are rejected | unit `state-machines.test.ts`, integration H |
| I | Idempotency | Same payment key → one payment; conflicting reuse rejected; concurrent overpay prevented; webhook replay has no second effect | `payments-idempotency.test.ts` |
| J | Localization | ar/fr/en load with correct `lang`/`dir`; no serious axe violations; no horizontal overflow at 360 px | `i18n-a11y.spec.ts` |

## 4. Non-functional requirements

- Server-side authorization for every read/write (`OrgContext` + permission + `organizationId` filter).
- All user-facing strings from dictionaries; enum labels translated; IDs/plates/amounts LTR-isolated.
- Money exact (integer minor units; DECIMAL(14,2) storage).
- Timestamps UTC in DB; displayed in the org timezone; calendar dates stored as `DATE` and never shifted.
- WCAG 2.2 AA target (automated checks are a floor, not proof).
- Works on a mid-range Android phone over mobile data (no heavy client bundles on field pages).
