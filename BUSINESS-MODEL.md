# Business model

> Every number here is an **assumption** until replaced by interview or sales data. Assumption IDs (A-xx) are tracked in `DECISIONS.md` and `PRICING-ASSUMPTIONS.md`.

## 1. Engines and revenue sources

| Engine | Customer | Revenue (MVP) | Revenue (later) | Status |
|--------|----------|---------------|-----------------|--------|
| NEXVO Business | Private collection companies, environmental service providers | Monthly/annual SaaS subscription per organization, tiered by users/vehicles/customers (enforced in code: `enforcePlanLimit`) | Paid onboarding/data import; extra vehicles/seats; integrations | **Priority — built** |
| NEXVO Civic | Communes (APC), possibly wilayas | Pilot fee or free pilot bundled with a contractor | Annual municipal contract via Law 23-12 procedures; implementation services; reporting | Pilot-ready, slow sales cycle (F7) |
| NEXVO Market | Recyclers, material buyers | — | Transaction commission on verified settlements (kept separate from GMV) | Not built; launch gated (ROADMAP) |

Platform revenue is accounted separately from: customer payments to collectors (recorded in NEXVO but never NEXVO revenue), material-sale proceeds, and any rewards budget.

## 2. Unit economics — assumptions

| ID | Assumption | Value | Basis |
|----|-----------|-------|-------|
| A-10 | Plan mix Starter/Pro/Enterprise | 60% / 35% / 5% | guess; validate in pilots |
| A-11 | Average revenue per account (ARPA), monthly, excl. VAT | **17,650 DZD** (= 0.6×9,900 + 0.35×24,900 + 0.05×59,900) | derived from A-10 and PRICING-ASSUMPTIONS |
| A-12 | Hosting + storage + backups, monthly fixed | 60,000 DZD | assumption for one managed Postgres+PostGIS, one app instance, object storage; **must be quoted** |
| A-13 | Support/onboarding variable cost per customer per month | 2,500 DZD | assumption |
| A-14 | Fixed operating expenses (team, office, legal, travel), monthly | 900,000 DZD | placeholder for a 3–4 person team; replace with real budget |
| A-15 | Payment collection delay for B2B subscriptions | 30–60 days | typical for Algerian B2B (assumption; validate) |
| A-16 | CAC (founder-led sales, demos, travel) | 35k–60k DZD | assumption |

## 3. Scenarios at month 12 (computed, not forecasts)

| Scenario | Paying customers | Monthly churn | MRR (DZD) | ARR (DZD) | Variable+hosting cost | Gross margin | LTV (ARPA×GM÷churn) | LTV/CAC | Monthly net burn (incl. A-14) |
|----------|-----------------|---------------|-----------|-----------|-----------------------|--------------|----------------------|---------|-------------------------------|
| Conservative | 8 | 3.0% | 141,200 | 1,694,400 | 80,000 | 43.3% | 255,000 | 4.2 (CAC 60k) | 838,800 |
| Base | 20 | 2.0% | 353,000 | 4,236,000 | 110,000 | 68.8% | 607,500 | 13.5 (CAC 45k) | 657,000 |
| Optimistic | 40 | 1.5% | 706,000 | 8,472,000 | 160,000 | 77.3% | 910,000 | 26.0 (CAC 35k) | 354,000 |

Reading: **none of the scenarios is profitable at month 12** once fixed operating costs are included. Break-even on A-14 needs roughly (900,000 + 60,000) ÷ (17,650 − 2,500) ≈ **64 paying accounts** at the assumed ARPA. That is the number sales planning should be built around, and the main argument for either raising ARPA (Pro tier, onboarding fees) or keeping fixed costs low.

Cash runway = cash on hand ÷ monthly net burn; with A-15, add 1–2 months of MRR as working capital.

## 4. Risks tracked

- **Revenue concentration:** early on, one customer may be >20% of MRR. Track the top-3 share monthly.
- **Municipal cycles:** treat Civic revenue as zero in all scenarios until a signed pilot order exists.
- **Price sensitivity:** status quo costs ~0 (Excel/WhatsApp); value must be proven via recovered invoices.
- **Payment collection:** no online card payment for subscriptions yet; invoices paid by transfer/cheque.

## 5. Metrics to instrument (from the product database)

MRR, ARR, active orgs (≥1 completed work order / week), evidence completion rate, invoice lag (completion → issue), DSO per customer org, churn, expansion (plan upgrades).

## 6. Sales workflow (first customers)

1. Warm intro → 30-min demo on seed data (`npm run db:seed`).
2. Pilot agreement: 60 days free, data import done by us, success metric agreed.
3. Weekly check-in with the dispatcher; review evidence and invoice-lag dashboards.
4. Conversion call at day 45 with measured results; 12-month price lock.

Customer interview guide: see `PRICING-ASSUMPTIONS.md` §4.
