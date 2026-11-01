# Recycling (الرسكلة / valorisation) — research and proposed module

Status: research note + design proposal, 2026-11-01. **Nothing in this file is implemented yet.** Figures are cited with their source and evidence grade; conflicting figures are shown side by side. The primary text of Law 25-02 could **not** be read from this environment (hosts blocked); every statement about it comes from secondary summaries and must be checked against the Journal officiel n° 12 of 2025 before it appears in product or sales material.

## 1. What the research says

### 1.1 Volumes and rates (grade B–C: press and secondary reports, inconsistent baselines)

| Figure | Value | Source |
|---|---|---|
| Household waste generated | 13.5 Mt (2020) → > 20 Mt (2035), AND estimate quoted in a national plan document | [Revadex blog](https://blog.revadex.com/2026/03/24/dechets-de-bureau-en-algerie/), [UNDP BUR1](https://data.undp.org/sites/g/files/zskgke476/files/2025-01/bur1_algerie_revise_vf_22102023.pdf) |
| Household waste recovered | < 7 % (AND, older) · 9.83 % (2026 blog) · "7–10 %" | same + [El Watan](https://elwatan.dz/plaidoirie-pour-valoriser-rapidement-30-a-40-des-dechets-en-algerie/) |
| All waste recycled | ~10–12 % of 34–36 Mt collected/year | [AlgeriaInvest](https://www.algeriainvest.com/fr/premium-news/recyclage-des-dechets-une-mine-dor-economique-encore-sous-exploitee) |
| Special waste recovered | ~150 kt of ~300 kt/year (~50 %) | same |
| Government target | 30 % recycled by 2029 (Environment ministry 5-year plan 2025–2029); 47 % of household waste by 2035 (SNGID) | [CDER portal](https://portail.cder.dz/2025/06/03/environnement-recyclage-de-30-des-dechets-dici-2029/) |
| Operators | ~20,000 active in industrial-waste recycling | [El Moudjahid](https://www.elmoudjahid.com/fr/actualite/recyclage-des-dechets-industriels-20-000-operateurs-en-activite-245893) |
| Economic potential | "38 billion DA/year" (press claim, method unknown) | [Algérie Solidaire](https://algeriesolidaire.net/la-valorisation-des-dechets-peut-rapporter-38-milliards-de-da-par-an/) |

**Reading:** recovery is low (single digits to ~12 %) against an official target of 30 % by 2029 — a large gap that creates demand for tools that *measure and prove* recovery.

### 1.2 Law (grade C until the JO text is read)

- **Law 25-02 of 20 Feb 2025** amends and supplements Law 01-19 (not a replacement), JO n° 12/2025. Summaries report: waste hierarchy, eco-design, **extended producer responsibility (REP/EPR)**, an obligation for producers/holders to **recover (valoriser)** their waste or pay an **éco-contribution**, a **national digital waste-management system**, progressive replacement of **single-use plastics** (art. 10 bis), mandatory **biological treatment of organic waste**, heavier penalties. Sources: [Regask](https://regask.com/algeria-waste-management-law/), [JORADP news](https://joradp.news/en/N/2025-02-23), [UNEP LEAP record](https://leap.unep.org/en/countries/dz/national-legislation/loi-ndeg-25-02-du-21-chaabane-1446-correspondant-au-20-fevrier), [Algérie Confluences](https://algerieconfluences.dz/economie-vertela-loi-25-02publiee-au-journal-officiel/).
- **Implementing decrees** (amounts of éco-contribution, who declares what, format of the digital system) were not found → the product must not assume them.
- **Special hazardous waste:** declaration (décret 05-315), transport (décret 04-409), export (décret 19-10), nomenclature (décret 06-104). No Algerian tracking-slip template was found ([FAOLEX](https://faolex.fao.org/docs/pdf/alg200194.pdf), [UpGrowth](https://www.upgrowth.dz/reference/decret-executif-n-19-10-du-23-janvier-2019-reglementant-l-exportation-des)).

### 1.3 Ecosystem

- **AND / SNID**: a national waste information system exists at the AND; its presentation lists local authorities, generators, collectors/transporters, **recyclers/transformers** as information providers, with CSV export ([EIONET presentation](https://eni-seis.eionet.europa.eu/south/communication/events/project-related-events/country-visit-to-algeria/documents/presentation-and)). The AND site has a recycler/collector registration form that asks for **purchase and sale prices of PET at each stage** ([and.dz](https://and.dz/https-snid-and-dz-inscription_recyc_recuppp-php/)). The data format for operators is unknown.
- **Eco-Jem**: packaging-recovery system created by a 2004 decree, financed by member companies, with an AND label and platform ([AlgérieInvest](https://www.algerieinvest.dz/recyclage-des-dechets-demballages-lagence-nationale-des-dechets-lance-le-label-eco-jem/)). No published performance evaluation found.
- **Sorting infrastructure**: 15 (minister, 2023) vs 23 (press) sorting centres; few operational; waste arrives mixed and late because there is **no source separation** ([Radio Algérie](https://news.radioalgerie.dz/fr/node/38508), [Dzair World](https://www.dzairworld.com/2021/06/24/tri-dechets-menagers-algerie/)).
- **Informal collectors** set most prices; they prefer clean homogeneous rigid plastics, PET and film ([ASJP study](https://asjp.cerist.dz/en/downArticle/9/17/1/146374)). Classified ads show scattered prices (PET 15 DA/kg wanted; cardboard bales 15,000 DA/t; aluminium cans 90,000 DA/t — undated, unverified) ([EspaceAgro](https://www.espaceagro.com/dechet-carton-algerie/exp-dechet-carton-algerie.html)). **There is no reliable public price series** → NEXVO must not show market prices it cannot source.

### 1.4 What recycling software does elsewhere (grade B: vendor pages)

Scale house with **immutable weight tickets** and audit trail; **commodity pricing** (index formulas, tiers, minimum payloads) and **rebates** to suppliers; **quality claims** adjusting settlement; **inventory by commodity and grade** through to sale; **margin per material**; **diversion-rate reports** tied back to inbound tonnage for municipal contracts ([AMCS Trux Weigh-IT](https://www.amcsgroup.com/solutions/enterprise-management/trux-weigh-it/), [AMCS MRF](https://www.amcsgroup.com/resources/blogs/bring-your-recycling-mrf-automation-to-the-next-level-with-amcs-platform/), [cieTrade](https://www.cietrade.com/recycling-plant-software/), [Neurobird](https://neurobird.com/wasterecycling/), [Re-TRAC](https://www.re-trac.com/)).

## 2. What NEXVO already has that recycling builds on

Waste categories per contract line, work orders with weight tickets and photos, customer certificates (monthly), containers, IoT fill sensors, invoices/payments, exports, municipal citizen reports, AI assistant with read-only tools.

## 3. Proposed module "NEXVO Recycle" (phased)

### Phase R1 — Source-separated collection and proof of recovery (fits current customers)
- **Material streams** (cardboard/paper, PET, HDPE, film, metals, aluminium, glass, organic, residual) mapped to waste categories; contract lines and work orders per stream.
- **Weight per stream** on each work order (several weight tickets, one per material) with photos; contamination flag.
- **Destination**: where each load went (sorting centre, named recycler, landfill/CET) — chain of custody.
- **Diversion rate** per customer, per site, per month and per commune = recovered ÷ total, always traceable to the tickets.
- **Recovery certificate (attestation de valorisation)** per customer and period: tonnes per material, destination recycler, references — what businesses will need to show they meet a "recover your waste" obligation **once the decrees confirm it**.

### Phase R2 — Sorting yard / centre de tri (for companies that sort and sell)
- **Inbound**: own collections + **purchases from collectors** (registered sellers, weight, grade, price per kg entered by the operator, paid with a printed/receipted voucher).
- **Sorting and baling**: bales with ID/QR label, material, grade, weight; rejects and losses recorded (mass balance in vs out).
- **Inventory** by material, grade and location.
- **Sales to recyclers**: buyer registry (with their registration/approval number), operator-set price lists, outbound weight ticket, delivery note, invoice, quality claims, **margin per material**.

### Phase R3 — Municipal and national reporting
- Commune dashboards: tonnes by stream, diversion rate vs the 30 %/2029 target, sorting campaigns, drop-off points (apport volontaire) with IoT fill levels.
- **SNID/AND export** once the AND data format is obtained (contact the AND; do not guess the format).
- EPR producer declarations / éco-contribution support **only after the implementing decrees** are published.

### Gated (not before evidence)
- **NEXVO Market** (B2B exchange between sorters and recyclers) — needs supply/demand evidence and a settlement model (existing roadmap gate).
- **Eco Points** for citizens/collectors — needs an approved, costed, abuse-resistant policy (D-14).
- Public price indices — no reliable source exists.

## 4. Open questions to validate (interviews)

1. Do collection companies already sell sorted materials? To whom, at what frequency, with what paperwork?
2. Do their commercial customers ask for proof of recovery today? Will they after Law 25-02's decrees?
3. How are informal collectors paid and recorded today? What would they accept (cash voucher, mobile payment)?
4. Which sorting centres are operational in the pilot wilaya, and who runs them?
5. What format does the AND expect from recyclers/collectors in SNID?
6. Exact text of Law 25-02 (JO n° 12/2025) and any implementing decrees.

## 5. Risks

Legal details unverified (primary text not read); no reliable price data; informal-sector inclusion must protect personal data (Law 18-07); recycling claims must never be inflated — every percentage must trace to weight tickets.
