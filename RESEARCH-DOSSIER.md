# Research dossier

Status: **Phase 1 desk research, first pass (2026-10-30).** All source IDs refer to `SOURCES.md`. No customer interviews have been conducted yet — every statement about customer behaviour below is a hypothesis.

## 1. Findings that shape the product

| # | Claim | Source | Quality | Geographic relevance | Limitation | Decision affected |
|---|-------|--------|---------|----------------------|------------|-------------------|
| F1 | Algeria produced >12 Mt of household & similar waste in 2023 (AND official) | S-10, S-12 | B | National | Press quoting AND; methodology not seen | Market framing only; not used for revenue sizing |
| F2 | >5,000 companies were active in household-waste management at end-2023 (transport, sorting, recycling, recovery) | S-10 | B | National | Includes non-collection activities and micro-enterprises | Business engine first (D-01); bottom-up model starts from this ceiling |
| F3 | Household waste is a commune (municipal) responsibility under Law 01-19 | S-20 | B | National | Article number from secondary sources | Civic engine targets communes; private collectors often work as municipal contractors → shared work-order model |
| F4 | Law 01-19 was amended by Law 25-02 (Feb 2025) toward a circular economy | S-21 | B | National | Text of new articles (5 bis, 5 bis 1) not read | Future Market module; reporting by waste category kept from day one |
| F5 | No general ministerial approval for ordinary collection appears to exist; a document claiming one was denied by the Ministry (Jan 2026) | S-23 | B | National | Press fact-check, not law; special streams may need approval | No licence-number field is *required*; hazardous categories flagged separately (D-07) |
| F6 | Law 18-07 (personal data) is in force since ANPDP set-up (2023); amended by Law 25-11 (2025) adding DPO/records/breach duties | S-24, S-25 | B/C | National | Amendment details from a vendor summary | Data minimisation, optional citizen PII, no PII on public endpoints, EXIF stripping, hosting-location question (see PRIVACY-AND-COMPLIANCE.md) |
| F7 | Public procurement is governed by Law 23-12 (2023), replacing Decree 15-247 | S-26 | B | National | Implementing texts not reviewed | Civic revenue is slow and tender-driven → pilots first (D-02) |
| F8 | Algeria moved to 69 wilayas / 1,541 communes in 2026 | S-28 | B | National | Press citing JO | Regions are free text with suggestions, never a hard enum (D-09) |
| F9 | Standard VAT is 19% (reduced 9%) | S-30 | B | National | Mandatory invoice mentions not verified | Per-org configurable tax rate in basis points; NIF/NIS/RC fields; invoice "legal format" flagged as open question |
| F10 | E-payments grew ~46% in 2025; only ~644 certified web merchants on CIB/SATIM | S-40, S-41 | B/C | National | Single trade sources | No online payment in MVP; manual payment recording + signed webhook interface ready for a gateway (D-06) |
| F11 | MENA mismanages ~67% of waste and recovers ~10% | S-03 | A | Regional | Regional averages | Positioning: traceability and evidence, not "smart bins" |
| F12 | Mature competitors (AMCS, Routeware/Rubicon) are enterprise-priced, quote-only, and Western-market focused; no Arabic/French-first product found | S-50–S-54 | A/C | Global | Absence of evidence is not evidence of absence; local Algerian tools not yet searched in Arabic | Differentiation on language, price point, local invoicing |
| F13 | Public OSM tile and Nominatim servers forbid heavy/bulk use | S-60, S-61 | A | Global | — | Map tiles configurable; no geocoding dependency in MVP; coordinates entered or picked (D-08) |

## 2. Customer hypotheses (to validate)

| ID | Hypothesis | How to validate | Kill criterion |
|----|-----------|-----------------|----------------|
| H1 | Private collectors with 2–15 trucks lose revenue to unbilled or disputed collections because proof of service is on paper/WhatsApp | 12 interviews with owners/dispatchers in Oran, Algiers, Blida; ask for last disputed invoice | <4 of 12 report a dispute or unbilled job in the last quarter |
| H2 | Their business customers (hotels, clinics, factories, retailers) increasingly ask for collection records (weights, dates) | Interview 6 customers of those collectors | <2 of 6 ask for records |
| H3 | Owners will pay 10–25k DZD/month if the tool replaces a spreadsheet + manual invoicing | Price-sensitivity questions (Van Westendorp) + pilot conversion | <3 pilots convert to paid at ≥10k DZD |
| H4 | Field crews can use an Android phone with mobile data for 3–4 taps per job | Pilot telemetry: % of work orders with evidence | <60% evidence completion after 4 weeks |
| H5 | Communes will run a free/low-cost pilot of citizen reporting if a contractor already uses NEXVO | 3 commune meetings via pilot customers | No commune agrees to a pilot within 6 months |

## 3. Bottom-up market model (assumptions, not facts)

```
Ceiling of active companies (F2)                      5,000
× share doing collection/transport with own trucks     A1 = 30%   (assumption)
× share with ≥2 vehicles and B2B customers             A2 = 40%   (assumption)
= serviceable segment                                  ≈ 600 companies
× reachable in year 1 (Oran, Algiers, Blida, Constantine) A3 = 35% ≈ 210
× year-1 conversion                                    A4 = 5–15% ≈ 10–30 paying customers
```

A1–A4 must be replaced by ONS/CNRC counts and interview data. Revenue scenarios are in `BUSINESS-MODEL.md`.

## 4. Fastest credible route to the first paying customer

1. Recruit 3 design-partner collectors through personal networks in one wilaya (start: Oran — the seed data mirrors this).
2. Free 60-day pilot, onboarding done by us (import customers/contracts from their spreadsheet).
3. Success metric agreed upfront: % of collections with evidence and % invoiced within 7 days.
4. Convert at the Starter/Professional hypothesis price with a 12-month price lock.

## 5. Open regulatory questions (need an Algerian lawyer / official texts)

1. Exact mandatory invoice mentions and numbering rules (CTCA, DGI) — and whether e-invoicing rules apply.
2. ANPDP: declaration vs. authorisation for (a) B2B customer contact data, (b) citizen reports with photos and geolocation; cross-border hosting rules (can production data be hosted outside Algeria?).
3. Approval/licensing for collection and transport of *special* and *hazardous* waste under Law 01-19 as amended by 25-02 and its implementing decrees.
4. Whether communes may procure SaaS below thresholds by consultation under Law 23-12, and applicable thresholds.
5. Electronic evidence admissibility (photos, timestamps) in commercial disputes.
6. Rules for publishing municipal performance data (public map).

## 6. Research gaps

- Local Algerian/Maghreb competitors not yet researched (needs Arabic/French search and field interviews).
- Truck counts and fleet sizes per operator (no public source found).
- Willingness to pay — zero primary data.
