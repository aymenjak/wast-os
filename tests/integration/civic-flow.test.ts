import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { addMember, isoDay, jpegWithExif, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { storage } from "@/server/storage";
import { submitCivicReport, getPublicReport, reviewCivicReport, getCivicReport, citizenFeedback, publicMapPoints, civicAnalytics, listCivicReports } from "@/server/services/civic";
import { createTeam, addTeamMember } from "@/server/services/fleet";
import { addEvidence, transitionWorkOrder } from "@/server/services/work-orders";
import type { OrgContext } from "@/server/context";

let muni: OrgContext, reviewer: OrgContext, agent: OrgContext, otherMuni: OrgContext;
let slug: string;
let teamId: string;

const report = (overrides: Record<string, unknown> = {}) => ({
  municipality: slug,
  category: "ILLEGAL_DUMPING",
  description: "Dépôt sauvage de gravats près de l'école primaire",
  latitude: "36.752887",
  longitude: "3.042048",
  addressHint: "Rue Didouche Mourad",
  reporterName: "Karim",
  reporterContact: "karim@example.test",
  clientSubmissionId: randomUUID(),
  ...overrides,
});

beforeAll(async () => {
  await resetDb();
  const m = await newOrg("MUNICIPALITY", "APC Alger Centre");
  muni = m.ctx;
  slug = m.org.slug;
  reviewer = await addMember(muni, "CIVIC_REVIEWER");
  agent = await addMember(muni, "FIELD_WORKER");
  otherMuni = (await newOrg("MUNICIPALITY", "APC Bab El Oued")).ctx;
  const team = await createTeam(muni, { name: "Brigade propreté 1" });
  teamId = team.id;
  await addTeamMember(muni, team.id, agent.membershipId);
});

describe("Scenario G — citizen report to confirmed resolution", () => {
  let id: string, code: string;

  it("submits anonymously, strips photo EXIF, and is idempotent on retry", async () => {
    const input = report();
    const r1 = await submitCivicReport(input, [{ name: "p.jpg", bytes: jpegWithExif() }]);
    const r2 = await submitCivicReport(input, [{ name: "p.jpg", bytes: jpegWithExif() }]);
    expect(r2.trackingCode).toBe(r1.trackingCode);
    expect(r2.duplicateSubmission).toBe(true);
    code = r1.trackingCode;
    const row = await prisma.civicReport.findUniqueOrThrow({ where: { trackingCode: code }, include: { evidence: true } });
    id = row.id;
    expect(row.evidence).toHaveLength(1);
    const bytes = Buffer.from(await storage().get(row.evidence[0]!.storageKey));
    expect(bytes.includes(Buffer.from("GPS-LAT"))).toBe(false);
  });

  it("public tracking view exposes no personal data", async () => {
    const pub = await getPublicReport(code);
    expect(pub?.status).toBe("SUBMITTED");
    const s = JSON.stringify(pub);
    expect(s).not.toContain("karim");
    expect(s).not.toContain("Karim");
    expect(await getPublicReport("NX-AAAA-AAAA-AAAA")).toBeNull();
  });

  it("flags nearby same-category reports as possible duplicates (PostGIS)", async () => {
    const near = await submitCivicReport(report({ latitude: "36.753100", longitude: "3.042200" }));
    const far = await submitCivicReport(report({ latitude: "36.770000", longitude: "3.060000" }));
    const detail = await getCivicReport(reviewer, id);
    const codes = detail.duplicates.map((d) => d.trackingCode);
    expect(codes).toContain(near.trackingCode);
    expect(codes).not.toContain(far.trackingCode);
    await reviewCivicReport(reviewer, (await prisma.civicReport.findUniqueOrThrow({ where: { trackingCode: near.trackingCode } })).id, { to: "DUPLICATE", duplicateOfTrackingCode: code });
  });

  it("reviewer verifies and assigns; field team resolves with evidence; citizen confirms", async () => {
    await reviewCivicReport(reviewer, id, { to: "UNDER_REVIEW" });
    await reviewCivicReport(reviewer, id, { to: "VERIFIED", priority: "HIGH", publicNote: "Signalement confirmé" });
    await reviewCivicReport(reviewer, id, { to: "ASSIGNED", teamId, scheduledDate: isoDay(0) });
    const wo = await prisma.workOrder.findUniqueOrThrow({ where: { civicReportId: id } });
    expect(wo.kind).toBe("CIVIC_INTERVENTION");

    await transitionWorkOrder(agent, wo.id, "start");
    expect((await getPublicReport(code))?.status).toBe("IN_PROGRESS");
    await addEvidence(agent, wo.id, "AFTER", { name: "after.jpg", bytes: jpegWithExif() });
    await transitionWorkOrder(agent, wo.id, "complete");
    expect((await getPublicReport(code))?.status).toBe("RESOLVED");

    expect(await citizenFeedback({ trackingCode: code, decision: "confirm" })).toBe("CONFIRMED");
    const timeline = (await getPublicReport(code))!.events.map((e) => e.toStatus);
    expect(timeline).toEqual(["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CONFIRMED"]);
    expect(await prisma.notification.count({ where: { recipient: "karim@example.test" } })).toBeGreaterThan(0);
  });

  it("dispute → reopen → reassign reuses the intervention work order", async () => {
    const { trackingCode } = await submitCivicReport(report({ category: "OVERFLOWING_BIN", latitude: "36.74", longitude: "3.05" }));
    const r = await prisma.civicReport.findUniqueOrThrow({ where: { trackingCode } });
    for (const to of ["UNDER_REVIEW", "VERIFIED"] as const) await reviewCivicReport(reviewer, r.id, { to });
    await reviewCivicReport(reviewer, r.id, { to: "ASSIGNED", teamId });
    const wo = await prisma.workOrder.findUniqueOrThrow({ where: { civicReportId: r.id } });
    await transitionWorkOrder(agent, wo.id, "start");
    await addEvidence(agent, wo.id, "AFTER", { name: "a.jpg", bytes: jpegWithExif() });
    await transitionWorkOrder(agent, wo.id, "complete");
    await expect(citizenFeedback({ trackingCode, decision: "dispute" })).rejects.toThrow("errors.civic.reasonRequired");
    await citizenFeedback({ trackingCode, decision: "dispute", reason: "Le bac déborde toujours" });
    await reviewCivicReport(reviewer, r.id, { to: "REOPENED", reason: "Contrôle terrain négatif" });
    await reviewCivicReport(reviewer, r.id, { to: "ASSIGNED", teamId });
    const again = await prisma.workOrder.findUniqueOrThrow({ where: { civicReportId: r.id } });
    expect(again.id).toBe(wo.id);
    expect(again.status).toBe("ASSIGNED");
    expect((await prisma.civicReport.findUniqueOrThrow({ where: { id: r.id } })).reopenCount).toBe(1);
  });
});

describe("Scenario H — invalid transitions are rejected", () => {
  it("cannot skip review, resolve manually, or act on terminal states", async () => {
    const { trackingCode } = await submitCivicReport(report({ latitude: "36.70", longitude: "3.10" }));
    const r = await prisma.civicReport.findUniqueOrThrow({ where: { trackingCode } });
    await expect(reviewCivicReport(reviewer, r.id, { to: "ASSIGNED", teamId })).rejects.toThrow("errors.invalidTransition");
    await expect(reviewCivicReport(reviewer, r.id, { to: "CONFIRMED" })).rejects.toThrow("errors.invalidTransition");
    await expect(citizenFeedback({ trackingCode, decision: "confirm" })).rejects.toThrow("errors.invalidTransition");
    await expect(reviewCivicReport(reviewer, r.id, { to: "REJECTED" })).rejects.toThrow("errors.civic.reasonRequired");
    await reviewCivicReport(reviewer, r.id, { to: "REJECTED", reason: "Hors périmètre communal" });
    await expect(reviewCivicReport(reviewer, r.id, { to: "UNDER_REVIEW" })).rejects.toThrow("errors.invalidTransition");
  });

  it("field workers cannot review; other municipalities cannot see the report", async () => {
    const { trackingCode } = await submitCivicReport(report({ latitude: "36.71", longitude: "3.11" }));
    const r = await prisma.civicReport.findUniqueOrThrow({ where: { trackingCode } });
    await expect(reviewCivicReport(agent, r.id, { to: "UNDER_REVIEW" })).rejects.toThrow("errors.forbidden");
    await expect(getCivicReport(otherMuni, r.id)).rejects.toThrow("errors.notFound");
    expect(await listCivicReports(otherMuni)).toHaveLength(0);
  });

  it("submission to an unverified municipality is refused", async () => {
    await prisma.organization.update({ where: { id: otherMuni.org.id }, data: { verificationStatus: "PENDING" } });
    await expect(submitCivicReport(report({ municipality: otherMuni.org.slug }))).rejects.toThrow("errors.notFound");
  });
});

describe("public map and analytics", () => {
  it("public map only shows verified-or-later reports with coarsened coordinates", async () => {
    const pts = await publicMapPoints(slug);
    expect(pts.length).toBeGreaterThan(0);
    for (const p of pts) {
      expect(["SUBMITTED", "UNDER_REVIEW", "REJECTED", "DUPLICATE"]).not.toContain(p.status);
      expect(Math.round(p.lat * 1000)).toBeCloseTo(p.lat * 1000, 6);
      expect(Object.keys(p).sort()).toEqual(["category", "lat", "lng", "status"]);
    }
  });

  it("analytics computes resolution metrics", async () => {
    const a = await civicAnalytics(muni);
    expect(a.resolvedCount).toBeGreaterThanOrEqual(2);
    expect(a.teamPerformance[0]?.team).toBe("Brigade propreté 1");
  });
});
