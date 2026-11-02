import type { WorkOrderStatus } from "@/lib/generated/prisma/enums";
import { DomainError, InvalidTransitionError } from "./errors";

export type WorkOrderAction =
  | "assign"
  | "unassign"
  | "start"
  | "complete"
  | "fail"
  | "cancel"
  | "reschedule"
  | "dispute"
  | "resolveDispute"
  | "redo";

type Rule = { from: readonly WorkOrderStatus[]; to: WorkOrderStatus; actor: "dispatch" | "execute" | "customer" };

export const WORK_ORDER_RULES: Record<WorkOrderAction, Rule> = {
  assign: { from: ["PLANNED", "ASSIGNED"], to: "ASSIGNED", actor: "dispatch" },
  unassign: { from: ["ASSIGNED"], to: "PLANNED", actor: "dispatch" },
  start: { from: ["ASSIGNED"], to: "IN_PROGRESS", actor: "execute" },
  complete: { from: ["IN_PROGRESS"], to: "COMPLETED", actor: "execute" },
  fail: { from: ["IN_PROGRESS", "ASSIGNED"], to: "FAILED", actor: "execute" },
  cancel: { from: ["PLANNED", "ASSIGNED"], to: "CANCELLED", actor: "dispatch" },
  reschedule: { from: ["FAILED"], to: "PLANNED", actor: "dispatch" },
  dispute: { from: ["COMPLETED"], to: "DISPUTED", actor: "customer" },
  resolveDispute: { from: ["DISPUTED"], to: "COMPLETED", actor: "dispatch" },
  redo: { from: ["DISPUTED"], to: "ASSIGNED", actor: "dispatch" },
};

export type WorkOrderSnapshot = {
  status: WorkOrderStatus;
  teamId: string | null;
  vehicleId: string | null;
  kind: "COLLECTION" | "CIVIC_INTERVENTION";
};

export type TransitionInput = {
  teamId?: string | null;
  evidenceCount?: number;
  failureReason?: string | null;
  disputeReason?: string | null;
};

/** Validates a transition and returns the target status. Throws on any violation. */
export function planWorkOrderTransition(
  wo: WorkOrderSnapshot,
  action: WorkOrderAction,
  input: TransitionInput = {},
): WorkOrderStatus {
  const rule = WORK_ORDER_RULES[action];
  if (!rule.from.includes(wo.status)) throw new InvalidTransitionError("WorkOrder", wo.status, rule.to);

  switch (action) {
    case "assign":
      if (!input.teamId) throw new DomainError("errors.workOrder.teamRequired");
      break;
    case "start":
      if (!wo.teamId) throw new DomainError("errors.workOrder.teamRequired");
      if (wo.kind === "COLLECTION" && !wo.vehicleId) throw new DomainError("errors.workOrder.vehicleRequired");
      break;
    case "complete":
      if (!input.evidenceCount || input.evidenceCount < 1) throw new DomainError("errors.workOrder.evidenceRequired");
      break;
    case "fail":
      if (!input.failureReason) throw new DomainError("errors.workOrder.failureReasonRequired");
      break;
    case "dispute":
      if (!input.disputeReason?.trim()) throw new DomainError("errors.workOrder.disputeReasonRequired");
      break;
  }
  return rule.to;
}

export function allowedWorkOrderActions(status: WorkOrderStatus): WorkOrderAction[] {
  return (Object.keys(WORK_ORDER_RULES) as WorkOrderAction[]).filter((a) => WORK_ORDER_RULES[a].from.includes(status));
}
