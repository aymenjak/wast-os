import { describe, expect, it } from "vitest";
import { allowedWorkOrderActions, planWorkOrderTransition } from "@/server/domain/work-order-machine";
import { assertCivicTransition, CIVIC_TRANSITIONS, nextCivicStatuses } from "@/server/domain/civic-machine";
import type { CivicReportStatus } from "@/lib/generated/prisma/enums";

const wo = (status: Parameters<typeof planWorkOrderTransition>[0]["status"], extra = {}) => ({
  status, teamId: "t1", vehicleId: "v1", kind: "COLLECTION" as const, ...extra,
});

describe("work order state machine", () => {
  it("happy path", () => {
    expect(planWorkOrderTransition(wo("PLANNED", { teamId: null }), "assign", { teamId: "t1" })).toBe("ASSIGNED");
    expect(planWorkOrderTransition(wo("ASSIGNED"), "start")).toBe("IN_PROGRESS");
    expect(planWorkOrderTransition(wo("IN_PROGRESS"), "complete", { evidenceCount: 1 })).toBe("COMPLETED");
  });
  it("guards", () => {
    expect(() => planWorkOrderTransition(wo("PLANNED"), "assign", {})).toThrow("errors.workOrder.teamRequired");
    expect(() => planWorkOrderTransition(wo("ASSIGNED", { vehicleId: null }), "start")).toThrow("errors.workOrder.vehicleRequired");
    expect(planWorkOrderTransition(wo("ASSIGNED", { vehicleId: null, kind: "CIVIC_INTERVENTION" }), "start")).toBe("IN_PROGRESS");
    expect(() => planWorkOrderTransition(wo("IN_PROGRESS"), "complete", { evidenceCount: 0 })).toThrow("errors.workOrder.evidenceRequired");
    expect(() => planWorkOrderTransition(wo("IN_PROGRESS"), "fail", {})).toThrow("errors.workOrder.failureReasonRequired");
    expect(() => planWorkOrderTransition(wo("COMPLETED"), "dispute", { disputeReason: "  " })).toThrow("errors.workOrder.disputeReasonRequired");
  });
  it("rejects invalid transitions", () => {
    expect(() => planWorkOrderTransition(wo("PLANNED"), "complete", { evidenceCount: 3 })).toThrow("errors.invalidTransition");
    expect(() => planWorkOrderTransition(wo("COMPLETED"), "cancel")).toThrow("errors.invalidTransition");
    expect(() => planWorkOrderTransition(wo("CANCELLED"), "assign", { teamId: "t" })).toThrow("errors.invalidTransition");
    expect(allowedWorkOrderActions("CANCELLED")).toEqual([]);
  });
});

describe("civic report state machine", () => {
  const all = Object.keys(CIVIC_TRANSITIONS) as CivicReportStatus[];

  it("matches the specified main lifecycle", () => {
    const path: [CivicReportStatus, CivicReportStatus, "reviewer" | "system" | "citizen"][] = [
      ["SUBMITTED", "UNDER_REVIEW", "reviewer"],
      ["UNDER_REVIEW", "VERIFIED", "reviewer"],
      ["IN_PROGRESS", "RESOLVED", "system"],
      ["RESOLVED", "CONFIRMED", "citizen"],
    ];
    for (const [f, t, a] of path) expect(() => assertCivicTransition(f, t, a)).not.toThrow();
    expect(() => assertCivicTransition("VERIFIED", "ASSIGNED", "reviewer", { workOrderTeamId: "t" })).not.toThrow();
  });

  it("reviewers can never set IN_PROGRESS or RESOLVED directly", () => {
    for (const from of all) {
      expect(nextCivicStatuses(from, "reviewer")).not.toContain("RESOLVED");
      expect(nextCivicStatuses(from, "reviewer")).not.toContain("IN_PROGRESS");
    }
  });

  it("terminal states have no exits", () => {
    for (const s of ["CONFIRMED", "REJECTED", "DUPLICATE", "CANCELLED"] as const) {
      for (const to of all) for (const a of ["reviewer", "citizen", "system"] as const)
        expect(() => assertCivicTransition(s, to, a, { reason: "x", duplicateOfId: "d", workOrderTeamId: "t" })).toThrow();
    }
  });

  it("requires reasons and targets", () => {
    expect(() => assertCivicTransition("SUBMITTED", "REJECTED", "reviewer")).toThrow("errors.civic.reasonRequired");
    expect(() => assertCivicTransition("RESOLVED", "DISPUTED", "citizen", { reason: "" })).toThrow("errors.civic.reasonRequired");
    expect(() => assertCivicTransition("SUBMITTED", "DUPLICATE", "reviewer")).toThrow("errors.civic.duplicateTargetRequired");
    expect(() => assertCivicTransition("VERIFIED", "ASSIGNED", "reviewer")).toThrow("errors.workOrder.teamRequired");
  });

  it("citizens can only confirm, dispute or cancel", () => {
    const citizenTargets = new Set(all.flatMap((s) => nextCivicStatuses(s, "citizen")));
    expect([...citizenTargets].sort()).toEqual(["CANCELLED", "CONFIRMED", "DISPUTED"]);
  });
});
