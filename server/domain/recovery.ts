import type { DestinationKind, MaterialStream } from "@/lib/generated/prisma/enums";

/**
 * Recovery accounting rules (RECYCLING.md §3, methodology from diversion-rate guidance):
 *  - a load counts as RECOVERED only when it went to a recovery destination (recycler, sorting centre, composting),
 *    is not residual waste and was not flagged contaminated;
 *  - what the processor rejects (rejectedKg) is moved from recovered to disposed;
 *  - loads without a recorded destination are reported separately as "untracked" and are NOT counted as recovered;
 *  - diversion rate = recovered ÷ (recovered + disposed + untracked), same period for every stream.
 * All quantities are integer hundredths of a kilogram (no floating-point drift).
 */
export const RECOVERY_KINDS: ReadonlySet<DestinationKind> = new Set(["RECYCLER", "SORTING_CENTRE", "COMPOSTING"]);

export type TicketForRecovery = { netMinor: number; rejectedMinor: number; stream: MaterialStream | null; contaminated: boolean; destinationKind: DestinationKind | null };
export type Split = { recovered: number; disposed: number; untracked: number };

export function splitTicket(t: TicketForRecovery): Split {
  if (!t.destinationKind) return { recovered: 0, disposed: 0, untracked: t.netMinor };
  const recoverable = RECOVERY_KINDS.has(t.destinationKind) && t.stream !== "RESIDUAL" && t.stream !== null && !t.contaminated;
  if (!recoverable) return { recovered: 0, disposed: t.netMinor, untracked: 0 };
  const rejected = Math.min(Math.max(t.rejectedMinor, 0), t.netMinor);
  return { recovered: t.netMinor - rejected, disposed: rejected, untracked: 0 };
}

export function addSplits(a: Split, b: Split): Split {
  return { recovered: a.recovered + b.recovered, disposed: a.disposed + b.disposed, untracked: a.untracked + b.untracked };
}

export const EMPTY_SPLIT: Split = { recovered: 0, disposed: 0, untracked: 0 };

/** Recovered share of everything handled, or null when nothing was weighed. */
export function diversionRate(s: Split): number | null {
  const total = s.recovered + s.disposed + s.untracked;
  return total > 0 ? s.recovered / total : null;
}
