import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { parse } from "../validation";
import { addEvidence, addWeightTicket, recordSignature, transitionWorkOrder } from "./work-orders";
import { listDestinations } from "./recycling";
import type { WorkOrderStatus } from "@/lib/generated/prisma/enums";

/**
 * Offline driver app (D-77). The phone keeps a copy of the driver's jobs ("bundle") and queues what the
 * driver does while offline; each queued action carries an id made on the phone (clientRef) and the time it
 * really happened (occurredAt). Replaying an action is always safe: the same clientRef, or a job already in the
 * state the action leads to, is reported as a duplicate instead of an error.
 */

/** How far a phone clock may be ahead of the server, and how long an action may wait in the outbox. */
export const MAX_CLOCK_SKEW_MS = 5 * 60_000;
export const MAX_OUTBOX_AGE_MS = 7 * 86_400_000;

function assertFieldWriter(ctx: OrgContext) {
  if (ctx.support) throw new DomainError("errors.support.readOnly");
  requirePermission(ctx, "workorders.execute");
}

async function myTeamIds(ctx: OrgContext) {
  const rows = await prisma.teamMember.findMany({ where: { membershipId: ctx.membershipId, team: { organizationId: ctx.org.id } }, select: { teamId: true } });
  return rows.map((r) => r.teamId);
}

function dayUTC(offsetDays: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

/**
 * Everything the phone needs to work a shift without network: the jobs of the driver's teams scheduled from
 * yesterday to tomorrow (plus any job still in progress), and the active destinations for weight tickets.
 * Only the driver's own teams, also for users who may dispatch: this is "my work", not the dispatch board.
 */
export async function fieldBundle(ctx: OrgContext) {
  requirePermission(ctx, "workorders.execute");
  const teamIds = await myTeamIds(ctx);
  const jobs = teamIds.length
    ? await prisma.workOrder.findMany({
        where: {
          organizationId: ctx.org.id,
          teamId: { in: teamIds },
          OR: [
            { status: "IN_PROGRESS" },
            { status: { in: ["ASSIGNED", "COMPLETED", "FAILED"] }, scheduledDate: { gte: dayUTC(-1), lte: dayUTC(1) } },
          ],
        },
        orderBy: [{ scheduledDate: "asc" }, { number: "asc" }],
        take: 200,
        select: {
          id: true, number: true, kind: true, status: true, priority: true, scheduledDate: true, instructions: true,
          customer: { select: { name: true } },
          serviceLocation: { select: { label: true, addressLine: true, commune: true, accessNotes: true, latitude: true, longitude: true } },
          civicReport: { select: { trackingCode: true, addressHint: true } },
          wasteCategory: { select: { nameEn: true, nameFr: true, nameAr: true, stream: true } },
          vehicle: { select: { plateNumber: true } },
          signedAt: true,
          _count: { select: { evidence: true, weightTickets: true } },
        },
      })
    : [];
  const hasCollection = jobs.some((j) => j.kind === "COLLECTION");
  const destinations = hasCollection ? await listDestinations(ctx, { activeOnly: true }).catch(() => []) : [];
  return {
    serverTime: new Date().toISOString(),
    jobs: jobs.map((j) => ({
      id: j.id,
      number: j.number,
      kind: j.kind,
      status: j.status,
      priority: j.priority,
      scheduledDate: j.scheduledDate.toISOString().slice(0, 10),
      instructions: j.instructions,
      title: j.customer?.name ?? j.civicReport?.trackingCode ?? j.number,
      address: j.serviceLocation ? [j.serviceLocation.addressLine, j.serviceLocation.commune].filter(Boolean).join(", ") : (j.civicReport?.addressHint ?? null),
      accessNotes: j.serviceLocation?.accessNotes ?? null,
      lat: j.serviceLocation?.latitude != null ? Number(j.serviceLocation.latitude) : null,
      lng: j.serviceLocation?.longitude != null ? Number(j.serviceLocation.longitude) : null,
      category: j.wasteCategory ? { en: j.wasteCategory.nameEn, fr: j.wasteCategory.nameFr, ar: j.wasteCategory.nameAr } : null,
      stream: j.wasteCategory?.stream ?? null,
      plate: j.vehicle?.plateNumber ?? null,
      evidenceCount: j._count.evidence,
      ticketCount: j._count.weightTickets,
      signed: j.signedAt != null,
    })),
    destinations: destinations.map((x) => ({ id: x.id, name: x.name, kind: x.kind })),
  };
}

export type FieldBundle = Awaited<ReturnType<typeof fieldBundle>>;

const clientRef = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);

export const fieldActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("start"), id: clientRef, workOrderId: z.string().min(1).max(64), occurredAt: z.iso.datetime() }),
  z.object({
    type: z.literal("complete"), id: clientRef, workOrderId: z.string().min(1).max(64), occurredAt: z.iso.datetime(),
    data: z.object({ completionNotes: z.string().max(4000).optional() }).default({}),
  }),
  z.object({
    type: z.literal("fail"), id: clientRef, workOrderId: z.string().min(1).max(64), occurredAt: z.iso.datetime(),
    data: z.object({ failureReason: z.string().max(40), failureNotes: z.string().max(2000).optional() }),
  }),
  z.object({
    type: z.literal("weight"), id: clientRef, workOrderId: z.string().min(1).max(64), occurredAt: z.iso.datetime(),
    data: z.record(z.string(), z.unknown()),
  }),
]);

export type FieldAction = z.infer<typeof fieldActionSchema>;
export type FieldResult = { id: string; outcome: "applied" | "duplicate"; status: WorkOrderStatus };

/** Rejects times from the future (beyond clock skew) or older than the outbox limit. */
export function checkOccurredAt(iso: string, now = Date.now()) {
  const t = new Date(iso);
  const ms = t.getTime();
  if (Number.isNaN(ms) || ms > now + MAX_CLOCK_SKEW_MS || ms < now - MAX_OUTBOX_AGE_MS) {
    throw new DomainError("errors.offline.occurredAt", { fields: { occurredAt: "invalid" } });
  }
  // A phone a few minutes ahead must not record an end time in the server's future.
  return new Date(Math.min(ms, now));
}

/** Target status per transition: if the job is already there, a replay is a duplicate, not an error. */
const REACHED: Record<"start" | "complete" | "fail", WorkOrderStatus[]> = {
  start: ["IN_PROGRESS", "COMPLETED", "FAILED"],
  complete: ["COMPLETED"],
  fail: ["FAILED"],
};

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002";
}

async function statusOf(ctx: OrgContext, workOrderId: string) {
  const wo = await prisma.workOrder.findFirst({ where: { id: workOrderId, organizationId: ctx.org.id }, select: { status: true, teamId: true } });
  if (!wo) throw new NotFoundError("WorkOrder");
  return wo;
}

/** Applies one queued action from the phone. Authorization is the same as the online pages (team membership). */
export async function applyFieldAction(ctx: OrgContext, input: unknown): Promise<FieldResult> {
  assertFieldWriter(ctx);
  const a = parse(fieldActionSchema, input);
  const at = checkOccurredAt(a.occurredAt);

  if (a.type === "weight") {
    const before = await prisma.weightTicket.findFirst({ where: { organizationId: ctx.org.id, clientRef: a.id }, select: { workOrderId: true } });
    try {
      await addWeightTicket(ctx, a.workOrderId, a.data, { clientRef: a.id, weighedAt: at });
    } catch (e) {
      // Two deliveries of the same action racing each other: the unique index keeps one, the other is a duplicate.
      if (!isUniqueViolation(e)) throw e;
      const t = await prisma.weightTicket.findFirst({ where: { organizationId: ctx.org.id, clientRef: a.id }, select: { workOrderId: true } });
      if (!t || t.workOrderId !== a.workOrderId) throw e;
      return { id: a.id, outcome: "duplicate", status: (await statusOf(ctx, a.workOrderId)).status };
    }
    return { id: a.id, outcome: before ? "duplicate" : "applied", status: (await statusOf(ctx, a.workOrderId)).status };
  }

  const current = await statusOf(ctx, a.workOrderId);
  if (REACHED[a.type].includes(current.status)) {
    // Still check the driver may act on this job, so a duplicate reply does not reveal other teams' jobs.
    const teams = await myTeamIds(ctx);
    if (!current.teamId || !teams.includes(current.teamId)) {
      if (!ctx.permissions.has("workorders.dispatch")) throw new ForbiddenError("workorders.execute");
    }
    return { id: a.id, outcome: "duplicate", status: current.status };
  }
  const body = a.type === "complete" ? a.data : a.type === "fail" ? a.data : {};
  const status = await transitionWorkOrder(ctx, a.workOrderId, a.type, body, { occurredAt: at });
  return { id: a.id, outcome: "applied", status };
}

/** Photo taken offline, uploaded later with the id the phone gave it; a replay returns the stored file. */
export async function applyFieldEvidence(ctx: OrgContext, workOrderId: string, kind: string, ref: string, file: { name: string; bytes: Uint8Array }) {
  assertFieldWriter(ctx);
  const k = parse(z.enum(["BEFORE", "AFTER"]), kind);
  const r = parse(clientRef, ref);
  const before = await prisma.evidenceFile.findFirst({ where: { organizationId: ctx.org.id, clientRef: r }, select: { id: true } });
  try {
    const ev = await addEvidence(ctx, workOrderId, k, file, { clientRef: r });
    return { id: r, outcome: before ? ("duplicate" as const) : ("applied" as const), evidenceId: ev.id };
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    const ev = await prisma.evidenceFile.findFirst({ where: { organizationId: ctx.org.id, clientRef: r, workOrderId } });
    if (!ev) throw e;
    return { id: r, outcome: "duplicate" as const, evidenceId: ev.id };
  }
}

/** Customer signature drawn offline on the collection slip; uploaded later with its clientRef and the time it was signed. */
export async function applyFieldSignature(ctx: OrgContext, workOrderId: string, ref: string, signerName: string, signedAtIso: string, png: { name: string; bytes: Uint8Array }) {
  assertFieldWriter(ctx);
  const r = parse(clientRef, ref);
  const signedAt = checkOccurredAt(signedAtIso);
  const before = await prisma.evidenceFile.findFirst({ where: { organizationId: ctx.org.id, clientRef: r }, select: { id: true } });
  try {
    const ev = await recordSignature(ctx, workOrderId, { signerName }, png, { clientRef: r, signedAt });
    return { id: r, outcome: before ? ("duplicate" as const) : ("applied" as const), evidenceId: ev.id };
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    const ev = await prisma.evidenceFile.findFirst({ where: { organizationId: ctx.org.id, clientRef: r, workOrderId } });
    if (!ev) throw e;
    return { id: r, outcome: "duplicate" as const, evidenceId: ev.id };
  }
}
