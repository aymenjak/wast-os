/**
 * Chart palette, validated with the dataviz skill's validate_palette.js (light surface #ffffff):
 *  - completed/failed pair: #2a78d6 / #d03b3b → all checks pass, worst CVD ΔE 23.8 (protan)
 *  - single-series bars: slot 1 #2a78d6
 *  - receivables aging (ordinal, one hue): #ee9a5c → #6e2a10 → all checks pass; "not due" is neutral grey
 * The previous pair (#1f5a44 / #b42318) failed: CVD ΔE 6.0 and the green read as grey.
 */
export const CHART = {
  completed: "#2a78d6",
  failed: "#d03b3b",
  single: "#2a78d6",
  neutral: "#a7b1b0",
  agingRamp: ["#ee9a5c", "#d9692f", "#a8431a", "#6e2a10"],
  grid: "#e5e9e8",
  today: "#e8590c",
} as const;
