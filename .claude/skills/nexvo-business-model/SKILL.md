---
name: nexvo-business-model
description: Pricing hypotheses, unit economics, financial scenarios and sales workflow for NEXVO. Use when changing plans/prices, modelling revenue, or preparing customer interviews.
---
# NEXVO business model

## Procedure
1. Prices live in the `Plan` table (seed: `prisma/seed.ts`), shown on `/pricing`; limits enforced by `enforcePlanLimit`.
2. Update assumptions in `BUSINESS-MODEL.md` §2 (A-xx) and recompute scenarios with a script — never by hand.
3. Always include fixed operating costs; report break-even accounts count.
4. Keep platform revenue separate from customer payments, GMV and rewards budgets.
5. After interviews, replace assumptions with data and log the change in `DECISIONS.md`.

## Constraints
All prices are hypotheses until paid conversions exist. No profitability claims without full costs.
