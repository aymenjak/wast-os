---
name: nexvo-product-strategy
description: Scope, prioritize and write acceptance criteria for NEXVO features. Use when deciding what to build next, splitting a feature, or checking a request against MVP boundaries and the Business-first strategy.
---
# NEXVO product strategy

## Procedure
1. Read `PRODUCT-REQUIREMENTS.md` (personas, MVP table) and `ROADMAP.md` (current milestone).
2. Classify the request: Business (priority), Civic (pilot), Market (gated), Platform.
3. State the user job in one sentence with persona + device (e.g. "Driver on Android, Arabic").
4. Write acceptance criteria as testable statements, including at least one authorization and one invalid-input case.
5. Map each criterion to a test location (`tests/unit|integration|e2e`) before coding.
6. Record scope changes in `DECISIONS.md` with the reason and evidence ID.

## Constraints
- Market module and Eco Points stay gated (DECISIONS D-14, ROADMAP "Later").
- No fake metrics, testimonials or logos in any UI or copy.
- Prefer finishing an end-to-end workflow over adding a module.

## Done when
Criteria are in PRODUCT-REQUIREMENTS.md, each has planned evidence, and the roadmap reflects the change.
