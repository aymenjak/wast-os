import type { CivicReportStatus } from "@/lib/generated/prisma/enums";
import { DomainError, InvalidTransitionError } from "./errors";

export type CivicActor = "reviewer" | "citizen" | "system";

type Edge = { to: CivicReportStatus; actors: readonly CivicActor[] };

/**
 * Explicit transition table for citizen reports. Anything not listed is rejected.
 * IN_PROGRESS and RESOLVED are driven by the linked work order (actor "system"),
 * so a reviewer cannot mark a report resolved without field evidence.
 */
export const CIVIC_TRANSITIONS: Record<CivicReportStatus, readonly Edge[]> = {
  SUBMITTED: [
    { to: "UNDER_REVIEW", actors: ["reviewer"] },
    { to: "REJECTED", actors: ["reviewer"] },
    { to: "DUPLICATE", actors: ["reviewer"] },
    { to: "CANCELLED", actors: ["citizen", "reviewer"] },
  ],
  UNDER_REVIEW: [
    { to: "VERIFIED", actors: ["reviewer"] },
    { to: "REJECTED", actors: ["reviewer"] },
    { to: "DUPLICATE", actors: ["reviewer"] },
  ],
  VERIFIED: [{ to: "ASSIGNED", actors: ["reviewer"] }],
  ASSIGNED: [
    { to: "IN_PROGRESS", actors: ["system"] },
    { to: "VERIFIED", actors: ["reviewer"] },
  ],
  IN_PROGRESS: [{ to: "RESOLVED", actors: ["system"] }],
  RESOLVED: [
    { to: "CONFIRMED", actors: ["citizen", "system"] },
    { to: "DISPUTED", actors: ["citizen"] },
  ],
  DISPUTED: [
    { to: "REOPENED", actors: ["reviewer"] },
    { to: "CONFIRMED", actors: ["reviewer"] },
  ],
  REOPENED: [{ to: "ASSIGNED", actors: ["reviewer"] }],
  CONFIRMED: [],
  REJECTED: [],
  DUPLICATE: [],
  CANCELLED: [],
};

export const TERMINAL_CIVIC_STATUSES: readonly CivicReportStatus[] = ["CONFIRMED", "REJECTED", "DUPLICATE", "CANCELLED"];

export type CivicTransitionInput = {
  reason?: string | null;
  duplicateOfId?: string | null;
  workOrderTeamId?: string | null;
};

export function assertCivicTransition(
  from: CivicReportStatus,
  to: CivicReportStatus,
  actor: CivicActor,
  input: CivicTransitionInput = {},
): void {
  const edge = CIVIC_TRANSITIONS[from].find((e) => e.to === to);
  if (!edge || !edge.actors.includes(actor)) throw new InvalidTransitionError("CivicReport", from, to);

  if ((to === "REJECTED" || to === "DISPUTED" || to === "REOPENED") && !input.reason?.trim()) {
    throw new DomainError("errors.civic.reasonRequired");
  }
  if (to === "DUPLICATE" && !input.duplicateOfId) throw new DomainError("errors.civic.duplicateTargetRequired");
  if (to === "ASSIGNED" && !input.workOrderTeamId) throw new DomainError("errors.workOrder.teamRequired");
}

export function nextCivicStatuses(from: CivicReportStatus, actor: CivicActor): CivicReportStatus[] {
  return CIVIC_TRANSITIONS[from].filter((e) => e.actors.includes(actor)).map((e) => e.to);
}
