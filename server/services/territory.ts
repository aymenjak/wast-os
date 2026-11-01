import { z } from "zod";
import { prisma } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { DomainError, ForbiddenError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { dateOnly, isoDate, optionalText, parse, requiredText } from "../validation";
import { addSplits, diversionRate, EMPTY_SPLIT, splitTicket, type Split } from "../domain/recovery";
import { orgToday } from "./reports";
import { STREAMS } from "./recycling";
import { toMinor } from "@/lib/money";
import type { DestinationKind, MaterialStream } from "@/lib/generated/prisma/enums";

/**
 * R3 — territorial reporting (RECYCLING.md §3): figures by commune and wilaya for communes, wilayas and the providers they
 * delegate collection to (law 01-19 art. 32–33), drop-off points with fill levels, and sorting campaigns.
 * Every figure comes from weight tickets with the same rules as R1 (server/domain/recovery.ts). The commune is the one of
 * the work order's service location; tickets without one are grouped under "not recorded" — never guessed.
 * NOT done: the SNID/AND export (format not obtained) and producer EPR declarations (decrees not published).
 */

const NONE = "—";
const materialRate = (s: Split) => { const t = s.recovered + s.disposed + s.untracked; return t > 0 ? (s.recovered - s.energy) / t : null; };

async function ticketsInRange(ctx: OrgContext, from: string, to: string, commune?: string) {
  return prisma.weightTicket.findMany({
    where: {
      organizationId: ctx.org.id,
      weighedAt: { gte: dateOnly(from), lt: new Date(dateOnly(to).getTime() + 86400_000) },
      ...(commune ? { workOrder: { serviceLocation: { commune } } } : {}),
    },
    select: {
      netKg: true, rejectedKg: true, stream: true, contaminated: true,
      destination: { select: { kind: true } },
      workOrder: { select: { wasteCategory: { select: { stream: true } }, serviceLocation: { select: { commune: true, wilaya: true } } } },
    },
  });
}
type T = Awaited<ReturnType<typeof ticketsInRange>>[number];
const streamOf = (t: T): MaterialStream | null => t.stream ?? t.workOrder.wasteCategory?.stream ?? null;
const split = (t: T) => splitTicket({ netMinor: toMinor(t.netKg), rejectedMinor: toMinor(t.rejectedKg), stream: streamOf(t), contaminated: t.contaminated, destinationKind: (t.destination?.kind ?? null) as DestinationKind | null });

/** By commune (and its wilaya) over a period: totals, overall and material rates, tonnes by material. */
export async function territoryReport(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "reports.read");
  const f = parse(z.object({ from: isoDate, to: isoDate, commune: optionalText(80) }), input);
  const rows = await ticketsInRange(ctx, f.from, f.to, f.commune);
  const communes = new Map<string, { commune: string; wilaya: string; split: Split; byStream: Map<string, Split> }>();
  let total = EMPTY_SPLIT;
  for (const t of rows) {
    const commune = t.workOrder.serviceLocation?.commune?.trim() || NONE;
    const wilaya = t.workOrder.serviceLocation?.wilaya?.trim() || NONE;
    const key = `${wilaya}|${commune}`;
    const c = communes.get(key) ?? { commune, wilaya, split: EMPTY_SPLIT, byStream: new Map() };
    const s = split(t);
    c.split = addSplits(c.split, s);
    const sk = streamOf(t) ?? "NONE";
    c.byStream.set(sk, addSplits(c.byStream.get(sk) ?? EMPTY_SPLIT, s));
    communes.set(key, c);
    total = addSplits(total, s);
  }
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { name: true, legalName: true, recoveryTargetPct: true, recoveryTargetYear: true, recoveryTargetLabel: true } });
  const list = [...communes.values()]
    .map((c) => ({
      commune: c.commune, wilaya: c.wilaya, ...c.split, rate: diversionRate(c.split), materialRate: materialRate(c.split),
      byStream: [...c.byStream.entries()].map(([stream, s]) => ({ stream, ...s })).sort((a, b) => b.recovered + b.disposed + b.untracked - (a.recovered + a.disposed + a.untracked)),
    }))
    .sort((a, b) => (a.commune === NONE ? 1 : b.commune === NONE ? -1 : b.recovered + b.disposed + b.untracked - (a.recovered + a.disposed + a.untracked)));
  return {
    from: f.from, to: f.to, commune: f.commune ?? null, org,
    total: { ...total, rate: diversionRate(total), materialRate: materialRate(total) },
    communes: list, tickets: rows.length,
    localTarget: org.recoveryTargetPct ? { rate: org.recoveryTargetPct / 100, year: org.recoveryTargetYear!, label: org.recoveryTargetLabel } : null,
  };
}

/** Flat rows for the annual-indicators export (law 01-19 art. 33 bis 2 lists these quantities for the national plan). */
export async function territoryLedger(ctx: OrgContext, from: string, to: string) {
  const r = await territoryReport(ctx, { from, to });
  return r.communes.flatMap((c) => c.byStream.map((s) => ({
    wilaya: c.wilaya, commune: c.commune, stream: s.stream,
    totalKg: (s.recovered + s.disposed + s.untracked) / 100, materialKg: (s.recovered - s.energy) / 100, energyKg: s.energy / 100, disposedKg: s.disposed / 100, untrackedKg: s.untracked / 100,
  })));
}

export async function setLocalTarget(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "settings.manage");
  const d = parse(z.object({
    recoveryTargetPct: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(1).max(100).nullable()),
    recoveryTargetYear: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().int().min(2025).max(2100).nullable()),
    recoveryTargetLabel: optionalText(120),
  }), input);
  if ((d.recoveryTargetPct === null) !== (d.recoveryTargetYear === null)) throw new DomainError("errors.validation", { fields: { recoveryTargetYear: "required" } });
  await prisma.organization.update({ where: { id: ctx.org.id }, data: { recoveryTargetPct: d.recoveryTargetPct, recoveryTargetYear: d.recoveryTargetYear, recoveryTargetLabel: d.recoveryTargetPct ? d.recoveryTargetLabel ?? null : null } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "territory.target_set", entityType: "Organization", entityId: ctx.org.id, data: d });
}

// ───────────────────────────── Sorting campaigns ─────────────────────────────

function canPlan(ctx: OrgContext) {
  if (!hasPermission(ctx, "settings.manage") && !hasPermission(ctx, "workorders.dispatch")) throw new ForbiddenError("workorders.dispatch");
}

export async function createCampaign(ctx: OrgContext, input: unknown) {
  canPlan(ctx);
  const d = parse(z.object({
    name: requiredText(120), commune: requiredText(80), startsOn: isoDate, endsOn: isoDate,
    streams: z.array(z.enum(STREAMS)).min(1).max(STREAMS.length), description: optionalText(1000),
  }), input);
  if (d.endsOn < d.startsOn) throw new DomainError("errors.validation", { fields: { endsOn: "invalid" } });
  const c = await prisma.sortingCampaign.create({ data: { ...d, startsOn: dateOnly(d.startsOn), endsOn: dateOnly(d.endsOn), organizationId: ctx.org.id, createdById: ctx.userId } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "territory.campaign_created", entityType: "SortingCampaign", entityId: c.id, data: { commune: d.commune } });
  return c;
}

const DAY = 86400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Each campaign with a before/after comparison on its commune and materials: the campaign period (up to today) against
 * the period of the same length just before it. A comparison, not proof of effect (season, contracts and weather vary).
 */
export async function listCampaigns(ctx: OrgContext) {
  requirePermission(ctx, "reports.read");
  const today = orgToday(ctx);
  const campaigns = await prisma.sortingCampaign.findMany({ where: { organizationId: ctx.org.id }, orderBy: { startsOn: "desc" }, take: 50 });
  return Promise.all(campaigns.map(async (c) => {
    const start = iso(c.startsOn);
    const end = iso(c.endsOn) < today ? iso(c.endsOn) : today;
    if (start > today) return { ...c, startsOn: start, endsOn: iso(c.endsOn), status: "planned" as const, during: null, before: null };
    const days = Math.round((dateOnly(end).getTime() - dateOnly(start).getTime()) / DAY) + 1;
    const beforeFrom = iso(new Date(dateOnly(start).getTime() - days * DAY)), beforeTo = iso(new Date(dateOnly(start).getTime() - DAY));
    const sum = async (from: string, to: string) => {
      const ts = (await ticketsInRange(ctx, from, to, c.commune)).filter((t) => { const s = streamOf(t); return s !== null && c.streams.includes(s); });
      const s = ts.reduce((acc, t) => addSplits(acc, split(t)), EMPTY_SPLIT);
      return { from, to, totalKg: (s.recovered + s.disposed + s.untracked) / 100, recoveredKg: s.recovered / 100, rate: diversionRate(s), tickets: ts.length };
    };
    return { ...c, startsOn: start, endsOn: iso(c.endsOn), status: (iso(c.endsOn) < today ? "ended" : "running") as "ended" | "running", during: await sum(start, end), before: await sum(beforeFrom, beforeTo) };
  }));
}

// ───────────────────────────── Drop-off points (PAV) ─────────────────────────────

export async function createDropOffPoint(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const d = parse(z.object({
    name: requiredText(120), commune: optionalText(80), wilaya: optionalText(80), address: optionalText(300),
    latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180),
  }), input);
  if (await prisma.dropOffPoint.findFirst({ where: { organizationId: ctx.org.id, name: d.name } })) throw new DomainError("errors.territory.pointExists");
  const p = await prisma.dropOffPoint.create({ data: { ...d, latitude: d.latitude.toFixed(6), longitude: d.longitude.toFixed(6), organizationId: ctx.org.id } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "territory.dropoff_created", entityType: "DropOffPoint", entityId: p.id });
  return p;
}

/** Puts a container at a drop-off point for one material, or takes it back (empty point). Not for containers at a customer site. */
export async function assignContainer(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "fleet.write");
  const d = parse(z.object({ containerId: requiredText(64), dropOffPointId: optionalText(64), stream: z.preprocess((v) => (v === "" ? undefined : v), z.enum(STREAMS).optional()) }), input);
  const container = await prisma.container.findFirst({ where: { id: d.containerId, organizationId: ctx.org.id } });
  if (!container) throw new NotFoundError("Container");
  if (d.dropOffPointId) {
    if (container.serviceLocationId || container.status === "AT_CUSTOMER") throw new DomainError("errors.territory.containerAtCustomer");
    if (container.status === "RETIRED") throw new DomainError("errors.invalidTransition", { entity: "Container" });
    if (!d.stream) throw new DomainError("errors.validation", { fields: { stream: "required" } });
    const point = await prisma.dropOffPoint.findFirst({ where: { id: d.dropOffPointId, organizationId: ctx.org.id, active: true } });
    if (!point) throw new NotFoundError("DropOffPoint");
  }
  await prisma.container.update({ where: { id: container.id }, data: { dropOffPointId: d.dropOffPointId ?? null, stream: d.dropOffPointId ? d.stream : container.stream } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: d.dropOffPointId ? "territory.container_placed" : "territory.container_removed", entityType: "Container", entityId: container.id, data: { dropOffPointId: d.dropOffPointId ?? null, stream: d.stream ?? null } });
}

export async function listDropOffPoints(ctx: OrgContext) {
  if (!hasPermission(ctx, "fleet.read") && !hasPermission(ctx, "reports.read")) throw new ForbiddenError("fleet.read");
  const points = await prisma.dropOffPoint.findMany({
    where: { organizationId: ctx.org.id },
    include: { containers: { select: { id: true, code: true, type: true, stream: true, lastFillPct: true, lastFillAt: true, fillThresholdPct: true }, orderBy: { code: "asc" } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return points.map((p) => ({
    ...p, latitude: Number(p.latitude), longitude: Number(p.longitude),
    full: p.containers.filter((c) => c.lastFillPct !== null && c.lastFillPct >= c.fillThresholdPct).length,
  }));
}
