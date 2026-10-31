import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError } from "../domain/errors";
import { serviceDates, addDays } from "../domain/schedule";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { dateOnly, isoDate, parse } from "../validation";

const MAX_DAYS = 31;

/**
 * Creates PLANNED work orders for every active recurring contract line in [from, to].
 * Idempotent: (contractLineId, scheduledDate) is unique, so re-running never duplicates.
 */
export async function generateRecurringWorkOrders(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "workorders.dispatch");
  const { from, to } = parse(z.object({ from: isoDate, to: isoDate }), input);
  if (to < from || to > addDays(from, MAX_DAYS - 1)) throw new DomainError("errors.schedule.range", { max: MAX_DAYS });

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, select: { workingWeekdays: true } });
  const lines = await prisma.contractServiceLine.findMany({
    where: { organizationId: ctx.org.id, frequency: { not: "ON_DEMAND" }, contract: { status: "ACTIVE" }, serviceLocation: { active: true } },
    include: { contract: true },
  });

  const planned: { lineId: string; date: string }[] = [];
  for (const l of lines) {
    for (const date of serviceDates(
      { frequency: l.frequency, weekdays: l.weekdays, contractStart: l.contract.startDate.toISOString().slice(0, 10), contractEnd: l.contract.endDate?.toISOString().slice(0, 10) ?? null },
      from,
      to,
      org.workingWeekdays,
    )) planned.push({ lineId: l.id, date });
  }
  if (!planned.length) return { created: 0, skipped: 0 };

  return prisma.$transaction(async (tx) => {
    const existing = await tx.workOrder.findMany({
      where: { organizationId: ctx.org.id, contractLineId: { in: [...new Set(planned.map((p) => p.lineId))] }, scheduledDate: { gte: dateOnly(from), lte: dateOnly(to) } },
      select: { contractLineId: true, scheduledDate: true },
    });
    const seen = new Set(existing.map((e) => `${e.contractLineId}|${e.scheduledDate.toISOString().slice(0, 10)}`));
    let created = 0;
    for (const p of planned) {
      if (seen.has(`${p.lineId}|${p.date}`)) continue;
      const l = lines.find((x) => x.id === p.lineId)!;
      const number = await nextNumber(tx, ctx.org.id, "workorder", "WO");
      await tx.workOrder.create({
        data: {
          organizationId: ctx.org.id,
          number,
          kind: "COLLECTION",
          contractLineId: l.id,
          contractId: l.contractId,
          customerId: l.contract.customerId,
          serviceLocationId: l.serviceLocationId,
          wasteCategoryId: l.wasteCategoryId,
          scheduledDate: dateOnly(p.date),
          createdById: ctx.userId,
        },
      });
      created++;
    }
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "schedule.generated", entityType: "Schedule", entityId: `${from}..${to}`, data: { created, skipped: planned.length - created } });
    return { created, skipped: planned.length - created };
  });
}
