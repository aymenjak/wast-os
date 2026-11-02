# Pricing assumptions

**All prices are hypotheses.** They are stored in the `Plan` table (seeded by `prisma/seed.ts`), shown on `/pricing`, and can be changed without code. Prices are monthly, in DZD, excluding VAT.

## 1. Current hypothesis

| Plan | Monthly | Yearly (≈2 months free) | Users | Vehicles | Customers | Portal | Advanced reports |
|------|---------|-------------------------|-------|----------|-----------|--------|------------------|
| Starter | 9,900 | 99,000 | 5 | 3 | 50 | – | – |
| Professional | 24,900 | 249,000 | 20 | 15 | 400 | ✓ | ✓ |
| Enterprise | 59,900 | 599,000 | unlimited | unlimited | unlimited | ✓ | ✓ |

Limits are enforced server-side (`server/services/accounts.ts → enforcePlanLimit`); new organizations start on a 30-day trial of the first public plan.

## 2. Rationale (to be tested)

- **Value anchor (hypothesis H1):** if a 3-truck operator recovers even one unbilled or disputed B2B collection per week at ~3,500 DZD, that is ~15,000 DZD/month — above the Starter price.
- **Cost floor:** variable cost ≈ 2,500 DZD/customer/month (A-13); Starter keeps a positive contribution margin.
- **Simplicity:** flat per-organization tiers instead of per-seat pricing, because field crews should not be a cost reason to keep them off the system.
- **Competitor prices:** unknown (COMPETITOR-ANALYSIS.md); not used.

## 3. What would change the prices

| Signal | Action |
|--------|--------|
| ≥50% of interviewees name a price below 10k | Test a 4,900 "Solo" tier limited to 1 vehicle |
| Pilots value the customer portal most | Move portal into Starter, raise Professional |
| Enterprise prospects ask for integrations | Add paid onboarding/integration packages |

## 4. Interview questions (Van Westendorp + context)

1. How do you record a completed collection today? Show me the last one.
2. When did a customer last dispute or delay paying for a collection? What happened?
3. How long between a collection and the invoice?
4. At what monthly price would this be so cheap you'd doubt its quality? A bargain? Getting expensive? Too expensive?
5. Who decides on software purchases, and how do you pay suppliers (transfer, cheque, cash)?
6. Which of your customers ask for weights or collection certificates?
