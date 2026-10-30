import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError, NotFoundError } from "../domain/errors";
import { assertCivicTransition, nextCivicStatuses, TERMINAL_CIVIC_STATUSES } from "../domain/civic-machine";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { newTrackingCode } from "../auth/tokens";
import { IMAGE_TYPES, storeUpload, type StoredFile } from "../storage";
import { latitude, longitude, optionalText, parse } from "../validation";
import type { CivicReportStatus } from "@/lib/generated/prisma/enums";

const DUPLICATE_RADIUS_M = 75;
const DUPLICATE_WINDOW_DAYS = 14;

export async function publicMunicipalities() {
  return prisma.organization.findMany({
    where: { kind: "MUNICIPALITY", verificationStatus: "VERIFIED" },
    select: { slug: true, name: true, wilaya: true, commune: true },
    orderBy: { name: "asc" },
  });
}

const submitSchema = z.object({
  municipality: z.string().min(1).max(80),
  category: z.enum(["ILLEGAL_DUMPING", "OVERFLOWING_BIN", "MISSED_COLLECTION", "SANITATION", "OTHER"]),
  description: z.string().trim().min(10).max(2000),
  latitude,
  longitude,
  addressHint: optionalText(300),
  reporterName: optionalText(120),
  reporterContact: optionalText(160),
  clientSubmissionId: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
});

/**
 * Public, account-free submission. Idempotent on clientSubmissionId so a flaky mobile
 * connection that retries does not create duplicates. Photos are EXIF-stripped on upload.
 */
export async function submitCivicReport(input: unknown, photos: { name: string; bytes: Uint8Array }[] = []) {
  const data = parse(submitSchema, input);
  if (photos.length > 3) throw new DomainError("errors.upload.tooMany");

  const existing = await prisma.civicReport.findUnique({ where: { clientSubmissionId: data.clientSubmissionId } });
  if (existing) return { trackingCode: existing.trackingCode, duplicateSubmission: true };

  const municipality = await prisma.organization.findFirst({
    where: { slug: data.municipality, kind: "MUNICIPALITY", verificationStatus: "VERIFIED" },
  });
  if (!municipality) throw new NotFoundError("Municipality");

  const stored: StoredFile[] = [];
  for (const p of photos) stored.push(await storeUpload(p, { prefix: `org/${municipality.id}/civic`, allow: IMAGE_TYPES }));

  try {
    return await prisma.$transaction(async (tx) => {
      const report = await tx.civicReport.create({
        data: {
          organizationId: municipality.id,
          trackingCode: newTrackingCode(),
          clientSubmissionId: data.clientSubmissionId,
          category: data.category,
          description: data.description,
          latitude: data.latitude.toFixed(6),
          longitude: data.longitude.toFixed(6),
          addressHint: data.addressHint,
          reporterName: data.reporterName,
          reporterContact: data.reporterContact,
          events: { create: { toStatus: "SUBMITTED", actorType: "CITIZEN" } },
          evidence: { create: stored.map((s) => ({ ...s, organizationId: municipality.id, kind: "REPORT_PHOTO" as const })) },
        },
      });
      await audit(tx, { organizationId: municipality.id, actorType: "CITIZEN", action: "civic.submitted", entityType: "CivicReport", entityId: report.id });
      return { trackingCode: report.trackingCode, duplicateSubmission: false };
    });
  } catch (e) {
    // Concurrent retry with the same clientSubmissionId: return the winner.
    const again = await prisma.civicReport.findUnique({ where: { clientSubmissionId: data.clientSubmissionId } });
    if (again) return { trackingCode: again.trackingCode, duplicateSubmission: true };
    throw e;
  }
}

/** Public tracking view. Never returns reporter identity, contact, or internal notes. */
export async function getPublicReport(trackingCode: string) {
  if (!/^NX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trackingCode)) return null;
  const r = await prisma.civicReport.findUnique({
    where: { trackingCode },
    select: {
      trackingCode: true,
      category: true,
      status: true,
      addressHint: true,
      createdAt: true,
      resolvedAt: true,
      organization: { select: { name: true } },
      events: { select: { toStatus: true, publicNote: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return r;
}

const citizenSchema = z.object({
  trackingCode: z.string().min(5).max(30),
  decision: z.enum(["confirm", "dispute"]),
  reason: optionalText(1000),
});

export async function citizenFeedback(input: unknown) {
  const data = parse(citizenSchema, input);
  return prisma.$transaction(async (tx) => {
    const r = await tx.civicReport.findUnique({ where: { trackingCode: data.trackingCode } });
    if (!r) throw new NotFoundError("CivicReport");
    const to: CivicReportStatus = data.decision === "confirm" ? "CONFIRMED" : "DISPUTED";
    assertCivicTransition(r.status, to, "citizen", { reason: data.reason });
    await tx.civicReport.update({
      where: { id: r.id },
      data: { status: to, disputeReason: to === "DISPUTED" ? data.reason : undefined, closedAt: to === "CONFIRMED" ? new Date() : undefined },
    });
    await tx.civicReportEvent.create({ data: { reportId: r.id, fromStatus: r.status, toStatus: to, actorType: "CITIZEN" } });
    await audit(tx, { organizationId: r.organizationId, actorType: "CITIZEN", action: `civic.citizen_${data.decision}`, entityType: "CivicReport", entityId: r.id });
    return to;
  });
}

// ───────────── Municipal back office ─────────────

export async function listCivicReports(ctx: OrgContext, opts: { status?: CivicReportStatus; open?: boolean } = {}) {
  requirePermission(ctx, "civic.read");
  return prisma.civicReport.findMany({
    where: {
      organizationId: ctx.org.id,
      ...(opts.status ? { status: opts.status } : opts.open ? { status: { notIn: [...TERMINAL_CIVIC_STATUSES] } } : {}),
    },
    select: {
      id: true, trackingCode: true, category: true, status: true, priority: true, addressHint: true,
      latitude: true, longitude: true, createdAt: true, slaDueAt: true, reopenCount: true,
      workOrder: { select: { number: true, team: { select: { name: true } } } },
      _count: { select: { evidence: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 500,
  });
}

/** Open reports within DUPLICATE_RADIUS_M of the given report, same category, recent. */
export async function findPossibleDuplicates(ctx: OrgContext, reportId: string) {
  requirePermission(ctx, "civic.read");
  return prisma.$queryRaw<{ id: string; trackingCode: string; status: CivicReportStatus; distance_m: number; createdAt: Date }[]>`
    SELECT o."id", o."trackingCode", o."status", ST_Distance(o."geog", r."geog")::float8 AS distance_m, o."createdAt"
    FROM "CivicReport" r
    JOIN "CivicReport" o
      ON o."organizationId" = r."organizationId"
     AND o."id" <> r."id"
     AND o."category" = r."category"
     AND o."status" NOT IN ('REJECTED','DUPLICATE','CANCELLED','CONFIRMED')
     AND o."createdAt" >= r."createdAt" - make_interval(days => ${DUPLICATE_WINDOW_DAYS})
     AND ST_DWithin(o."geog", r."geog", ${DUPLICATE_RADIUS_M})
    WHERE r."id" = ${reportId} AND r."organizationId" = ${ctx.org.id}
    ORDER BY distance_m ASC
    LIMIT 10`;
}

export async function getCivicReport(ctx: OrgContext, reportId: string) {
  requirePermission(ctx, "civic.read");
  const r = await prisma.civicReport.findFirst({
    where: { id: reportId, organizationId: ctx.org.id },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      evidence: { orderBy: { createdAt: "asc" } },
      workOrder: { include: { team: true, vehicle: true, evidence: true } },
      duplicateOf: { select: { id: true, trackingCode: true } },
      serviceZone: true,
    },
  });
  if (!r) throw new NotFoundError("CivicReport");
  return { ...r, duplicates: await findPossibleDuplicates(ctx, r.id), nextStatuses: nextCivicStatuses(r.status, "reviewer") };
}

const reviewSchema = z.object({
  to: z.enum(["UNDER_REVIEW", "VERIFIED", "ASSIGNED", "REJECTED", "DUPLICATE", "REOPENED", "CONFIRMED", "CANCELLED"]),
  reason: optionalText(1000),
  publicNote: optionalText(500),
  duplicateOfTrackingCode: optionalText(30),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  teamId: optionalText(64),
  vehicleId: optionalText(64),
  scheduledDate: optionalText(10),
});

/**
 * Reviewer transition. Assignment creates (or re-opens) the intervention work order in the
 * same transaction. AI or automation never calls this for REJECTED/DUPLICATE without a human.
 */
export async function reviewCivicReport(ctx: OrgContext, reportId: string, input: unknown) {
  requirePermission(ctx, "civic.review");
  const data = parse(reviewSchema, input);
  return prisma.$transaction(async (tx) => {
    const r = await tx.civicReport.findFirst({ where: { id: reportId, organizationId: ctx.org.id }, include: { workOrder: true } });
    if (!r) throw new NotFoundError("CivicReport");

    let duplicateOfId: string | null = null;
    if (data.to === "DUPLICATE") {
      const target = data.duplicateOfTrackingCode
        ? await tx.civicReport.findFirst({ where: { trackingCode: data.duplicateOfTrackingCode, organizationId: ctx.org.id } })
        : null;
      if (!target || target.id === r.id) throw new DomainError("errors.civic.duplicateTargetRequired");
      duplicateOfId = target.id;
    }
    if (data.to === "ASSIGNED" && data.teamId) {
      const team = await tx.team.findFirst({ where: { id: data.teamId, organizationId: ctx.org.id, active: true } });
      if (!team) throw new NotFoundError("Team");
    }
    assertCivicTransition(r.status, data.to, "reviewer", { reason: data.reason, duplicateOfId, workOrderTeamId: data.teamId });

    const now = new Date();
    await tx.civicReport.update({
      where: { id: r.id },
      data: {
        status: data.to,
        priority: data.priority ?? r.priority,
        rejectionReason: data.to === "REJECTED" ? data.reason : undefined,
        duplicateOfId: duplicateOfId ?? undefined,
        verifiedAt: data.to === "VERIFIED" && !r.verifiedAt ? now : undefined,
        slaDueAt: data.to === "VERIFIED" && !r.slaDueAt ? new Date(now.getTime() + ctx.org.civicSlaHours * 3600_000) : undefined,
        reopenCount: data.to === "REOPENED" ? { increment: 1 } : undefined,
        closedAt: ["REJECTED", "DUPLICATE", "CONFIRMED", "CANCELLED"].includes(data.to) ? now : undefined,
      },
    });

    if (data.to === "ASSIGNED") {
      const scheduledDate = new Date(`${(data.scheduledDate && /^\d{4}-\d{2}-\d{2}$/.test(data.scheduledDate) ? data.scheduledDate : now.toISOString().slice(0, 10))}T00:00:00.000Z`);
      if (r.workOrder) {
        await tx.workOrder.update({
          where: { id: r.workOrder.id },
          data: { status: "ASSIGNED", teamId: data.teamId, vehicleId: data.vehicleId ?? null, scheduledDate, actualStart: null, actualEnd: null },
        });
      } else {
        const number = await nextNumber(tx, ctx.org.id, "workorder", "WO");
        await tx.workOrder.create({
          data: {
            organizationId: ctx.org.id,
            number,
            kind: "CIVIC_INTERVENTION",
            civicReportId: r.id,
            teamId: data.teamId,
            vehicleId: data.vehicleId ?? null,
            status: "ASSIGNED",
            priority: data.priority ?? r.priority,
            scheduledDate,
            instructions: r.description,
            createdById: ctx.userId,
          },
        });
      }
    }
    await tx.civicReportEvent.create({
      data: { reportId: r.id, fromStatus: r.status, toStatus: data.to, actorType: "USER", actorUserId: ctx.userId, publicNote: data.publicNote },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "civic.reviewed", entityType: "CivicReport", entityId: r.id, data: { from: r.status, to: data.to, reason: data.reason ?? null } });
    if (r.reporterContact) {
      await tx.notification.create({
        data: { organizationId: ctx.org.id, channel: "EMAIL", recipient: r.reporterContact, type: "civic.status_changed", payload: { trackingCode: r.trackingCode, status: data.to } },
      });
    }
    return data.to;
  });
}

/** Public map points: only verified-or-later reports, coordinates rounded to ~100 m, no free text. */
export async function publicMapPoints(municipalitySlug: string) {
  const rows = await prisma.civicReport.findMany({
    where: {
      organization: { slug: municipalitySlug, kind: "MUNICIPALITY", verificationStatus: "VERIFIED" },
      status: { in: ["VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CONFIRMED", "REOPENED", "DISPUTED"] },
      createdAt: { gte: new Date(Date.now() - 90 * 86400_000) },
    },
    select: { category: true, status: true, latitude: true, longitude: true },
    take: 1000,
  });
  return rows.map((r) => ({
    category: r.category,
    status: r.status,
    lat: Math.round(Number(r.latitude) * 1000) / 1000,
    lng: Math.round(Number(r.longitude) * 1000) / 1000,
  }));
}

export async function civicAnalytics(ctx: OrgContext) {
  requirePermission(ctx, "civic.read");
  const [byStatus, byCategory, overdue, resolution] = await Promise.all([
    prisma.civicReport.groupBy({ by: ["status"], where: { organizationId: ctx.org.id }, _count: true }),
    prisma.civicReport.groupBy({ by: ["category"], where: { organizationId: ctx.org.id }, _count: true }),
    prisma.civicReport.count({
      where: { organizationId: ctx.org.id, slaDueAt: { lt: new Date() }, status: { in: ["VERIFIED", "ASSIGNED", "IN_PROGRESS", "REOPENED"] } },
    }),
    prisma.$queryRaw<{ median_hours: number | null; n: bigint }[]>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600)::float8 AS median_hours,
             count(*) AS n
      FROM "CivicReport" WHERE "organizationId" = ${ctx.org.id} AND "resolvedAt" IS NOT NULL`,
  ]);
  const teamPerformance = await prisma.$queryRaw<{ team: string; completed: bigint; avg_hours: number | null }[]>`
    SELECT t."name" AS team, count(w."id") AS completed,
           avg(EXTRACT(EPOCH FROM (w."actualEnd" - w."actualStart")) / 3600)::float8 AS avg_hours
    FROM "WorkOrder" w JOIN "Team" t ON t."id" = w."teamId"
    WHERE w."organizationId" = ${ctx.org.id} AND w."kind" = 'CIVIC_INTERVENTION' AND w."status" = 'COMPLETED'
    GROUP BY t."name" ORDER BY completed DESC`;
  return {
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Partial<Record<CivicReportStatus, number>>,
    byCategory: byCategory.map((c) => ({ category: c.category, count: c._count })),
    overdue,
    medianResolutionHours: resolution[0]?.median_hours ?? null,
    resolvedCount: Number(resolution[0]?.n ?? 0),
    teamPerformance: teamPerformance.map((t) => ({ team: t.team, completed: Number(t.completed), avgHours: t.avg_hours })),
  };
}
