# Competitor analysis

Status: first pass from desk research (2026-10-30). Products listed are **research candidates**, not confirmed direct competitors in Algeria. Prices marked "unknown" were not published by the vendor; we did not estimate them.

| Product | What it actually is (verified) | Target market | Arabic/French UI | Public price | Relevance to NEXVO | Sources |
|---------|-------------------------------|---------------|------------------|--------------|--------------------|---------|
| AMCS Platform (formerly ELEMOS) | Enterprise SaaS for waste & recycling: billing/pricing engine, customer management, fleet (FleetMind telematics), work orders | Large haulers and municipalities, mainly Europe/N. America/Australia | Unknown | Unknown (quote-only; one aggregator shows "from $10k/mo", unverified) | Feature benchmark for billing and job costing; far above our target price | S-50, S-51 |
| RUBICONSmartCity (now presented by Routeware) | Cloud suite for municipal waste fleets: route completion, service exceptions, vehicle location without RFID | US municipalities (Atlanta, Houston, Phoenix…) | Unknown | Unknown (procured via public contracts) | Benchmark for civic/municipal fleet monitoring; corporate status after Routeware should be re-verified | S-52, S-53 |
| Wastebits | Cloud platform for special/hazardous waste profiles, approvals, EPA e-Manifest | US generators, TSDFs, brokers | Unknown | Unknown | Pattern for regulated waste workflows (future, not MVP); US-specific regulation | S-54 |
| Urban Sharing | **Not verified** — no evidence found in this pass linking it to waste collection. A 2023 Oslo route-optimisation tender exists but the winner is unknown | — | — | — | Excluded until verified | S-55 |
| Generic field-service SaaS (e.g. Jobber, ServiceTitan, Odoo Field Service) | Not researched in this pass | SMB field services | Odoo has French/Arabic | Not researched | Likely the real "alternative" for a small collector along with Excel/WhatsApp | — |
| Status quo: Excel + WhatsApp + paper delivery slips | Inferred, to be validated in interviews (H1) | Algerian SMEs | n/a | ~0 | **Primary competitor** | hypothesis |

## Feature parity check (2026-10-31)

Features that roll-off and hauler tools advertise (S-56–S-58), and NEXVO's status:

| Feature | Seen in | NEXVO |
|---------|---------|-------|
| Container tracking (where each skip is, history) | Starlight, RollOS, CurbWaste | ✅ v2 |
| Recurring routes / schedules | hauler suites generally | ✅ v2 (7-day generation, idempotent) |
| Stop-by-stop route printing | ServiceCore | ✅ v2 route sheet |
| Route optimisation | ServiceCore, Oslo tender | 🟡 straight-line suggestion only |
| Driver app with job changes | Starlight, ProHauler | ✅ mobile web field view (no native app, no offline) |
| Drivers receive stops via SMS link | RollOS | ❌ (needs SMS provider) |
| Double-booking locks on containers | RollOS | 🟡 state machine prevents delivering a container that is not in the yard |
| Live GPS/telematics | Starlight, Rubicon | ❌ |
| Integrated billing | AMCS, Starlight | ✅ |
| Online customer payment | hauler suites generally | 🟡 Chargily adapter, test mode (round 3) |
| Searchable, exportable lists | common | ✅ round 3 (server-side tables, Excel/CSV) |
| Service/collection certificates | common requirement for commercial customers | ✅ round 3 (monthly certificate, portal) |

## Positioning conclusions

1. Enterprise waste suites are not priced or localised for 2–15 truck Algerian operators → room for a focused, affordable, Arabic/French-first product.
2. Our differentiators must be operational, not "smart city" branding: evidence per job, invoicing from completed work, RTL Arabic, DZD/VAT, works on a basic Android phone.
3. The status quo is cheap; value must be shown as **recovered revenue and fewer disputes** (H1), measured in pilots.

## To do

- Search for Algerian/Tunisian/Moroccan waste or field-service SaaS in Arabic and French.
- Ask interviewees which tools they tried and why they stopped.
