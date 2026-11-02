import type { DestinationKind, MaterialStream } from "@/lib/generated/prisma/enums";

/**
 * Recovery accounting rules, aligned with the definitions of law 01-19 as amended by law 25-02 (JORA n° 12/2025, art. 3):
 * « تثمين النفايات » covers MATERIAL valorisation (preparation for reuse, repair, reuse, recycling, composting,
 * anaerobic digestion) and ENERGY valorisation (recovering heat/electricity by burning). Disposal (« الإزالة ») is last
 * in the hierarchy (art. 2).
 *  - material: destination is a recycler, sorting centre, composting, anaerobic digestion or reuse/repair site, the stream
 *    is known and not residual, and the load is not contaminated;
 *  - energy: destination is an energy-recovery plant (any stream — residual waste can be valorised energetically);
 *  - what the processor rejects (rejectedKg) is moved from recovered to disposed;
 *  - loads without a recorded destination are "untracked" and NEVER counted as recovered;
 *  - rate = recovered ÷ (recovered + disposed + untracked); `energy` is the part of `recovered` that is energy valorisation.
 * All quantities are integer hundredths of a kilogram (no floating-point drift).
 */
export const MATERIAL_KINDS: ReadonlySet<DestinationKind> = new Set(["RECYCLER", "SORTING_CENTRE", "COMPOSTING", "ANAEROBIC_DIGESTION", "REUSE_REPAIR"]);
export const ENERGY_KINDS: ReadonlySet<DestinationKind> = new Set(["ENERGY_RECOVERY"]);
/** Biological treatment required for organic waste (art. 35 bis), except waste of animal origin. */
export const BIOLOGICAL_KINDS: ReadonlySet<DestinationKind> = new Set(["COMPOSTING", "ANAEROBIC_DIGESTION"]);
/** Kept for callers that only need "is this a valorisation destination". */
export const RECOVERY_KINDS: ReadonlySet<DestinationKind> = new Set([...MATERIAL_KINDS, ...ENERGY_KINDS]);

export type TicketForRecovery = { netMinor: number; rejectedMinor: number; stream: MaterialStream | null; contaminated: boolean; destinationKind: DestinationKind | null };
export type Split = { recovered: number; disposed: number; untracked: number; energy: number };

export function splitTicket(t: TicketForRecovery): Split {
  if (!t.destinationKind) return { recovered: 0, disposed: 0, untracked: t.netMinor, energy: 0 };
  const rejected = Math.min(Math.max(t.rejectedMinor, 0), t.netMinor);
  if (ENERGY_KINDS.has(t.destinationKind)) return { recovered: t.netMinor - rejected, disposed: rejected, untracked: 0, energy: t.netMinor - rejected };
  const material = MATERIAL_KINDS.has(t.destinationKind) && t.stream !== "RESIDUAL" && t.stream !== null && !t.contaminated;
  if (!material) return { recovered: 0, disposed: t.netMinor, untracked: 0, energy: 0 };
  return { recovered: t.netMinor - rejected, disposed: rejected, untracked: 0, energy: 0 };
}

export function addSplits(a: Split, b: Split): Split {
  return { recovered: a.recovered + b.recovered, disposed: a.disposed + b.disposed, untracked: a.untracked + b.untracked, energy: a.energy + b.energy };
}

export const EMPTY_SPLIT: Split = { recovered: 0, disposed: 0, untracked: 0, energy: 0 };

/** Recovered share of everything handled, or null when nothing was weighed. */
export function diversionRate(s: Split): number | null {
  const total = s.recovered + s.disposed + s.untracked;
  return total > 0 ? s.recovered / total : null;
}

/** Organic tonnage that did not go to biological treatment (art. 35 bis indicator; animal-origin waste is exempt, so this is a prompt to check, not a verdict). */
export function organicOutsideBiological(t: TicketForRecovery): number {
  return t.stream === "ORGANIC" && t.destinationKind && !BIOLOGICAL_KINDS.has(t.destinationKind) ? t.netMinor : 0;
}
