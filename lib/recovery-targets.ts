/**
 * Official recovery targets as REPORTED by secondary sources (RECYCLING.md §1.1, grade B — not read in a primary text).
 * Shown only with their source, scope and grade. They do not measure exactly what NEXVO measures: NEXVO reports the share
 * of what an organization handled that went to material or energy valorisation; the targets concern national recycling.
 * The closest comparison is NEXVO's material recovery rate, which the territory report shows separately.
 */
export const REFERENCE_TARGETS = [
  {
    id: "plan-2025-2029",
    rate: 0.3,
    year: 2029,
    scope: "waste recycled (national)",
    source: "Environment ministry five-year plan 2025–2029, as reported by the CDER portal (3 June 2025)",
    url: "https://portail.cder.dz/2025/06/03/environnement-recyclage-de-30-des-dechets-dici-2029/",
    grade: "B",
  },
  {
    id: "sngid-2035",
    rate: 0.47,
    year: 2035,
    scope: "household waste recovered (national)",
    source: "Stratégie nationale de gestion intégrée des déchets (SNGID) 2035, as reported by the CDER portal",
    url: "https://portail.cder.dz/2025/06/03/environnement-recyclage-de-30-des-dechets-dici-2029/",
    grade: "B",
  },
] as const;
