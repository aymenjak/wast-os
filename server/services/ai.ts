import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { parse } from "../validation";
import { findPossibleDuplicates } from "./civic";
import { businessDashboard, orgToday } from "./reports";
import { AiUnavailableError, getAiProvider } from "../ai/provider";
import type { Prisma } from "@/lib/generated/prisma/client";

export function aiEnabled() {
  return getAiProvider() !== null;
}

function provider() {
  const p = getAiProvider();
  if (!p) throw new DomainError("errors.ai.disabled");
  return p;
}

async function run<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AiUnavailableError) throw new DomainError(`errors.ai.${e.reason === "disabled" ? "disabled" : e.reason === "refusal" ? "refusal" : "failed"}`);
    throw e;
  }
}

/** Suggests category/priority for a citizen report. Sends no reporter name, contact, photo or exact coordinates. */
export async function suggestCivicTriage(ctx: OrgContext, reportId: string, locale: "ar" | "fr" | "en") {
  requirePermission(ctx, "civic.review");
  const r = await prisma.civicReport.findFirst({
    where: { id: reportId, organizationId: ctx.org.id },
    select: { id: true, category: true, description: true, addressHint: true, _count: { select: { evidence: true } } },
  });
  if (!r) throw new NotFoundError("CivicReport");
  const dups = await findPossibleDuplicates(ctx, r.id);
  const res = await run(() =>
    provider().triageCivicReport({
      submittedCategory: r.category,
      description: r.description,
      addressHint: r.addressHint,
      photoCount: r._count.evidence,
      nearbyOpenSameCategory: dups.length,
      locale,
    }),
  );
  const s = await prisma.aiSuggestion.create({
    data: {
      organizationId: ctx.org.id, feature: "civic_triage", entityType: "CivicReport", entityId: r.id, model: res.model,
      output: res.output as Prisma.InputJsonValue, inputTokens: res.inputTokens, outputTokens: res.outputTokens, createdById: ctx.userId,
    },
  });
  return { id: s.id, ...res.output };
}

/** Records whether the human accepted the suggestion (for quality review); never applies it. */
export async function recordAiDecision(ctx: OrgContext, input: unknown) {
  const { suggestionId, accepted } = parse(z.object({ suggestionId: z.string().min(1), accepted: z.preprocess((v) => v === true || v === "true", z.boolean()) }), input);
  const s = await prisma.aiSuggestion.findFirst({ where: { id: suggestionId, organizationId: ctx.org.id } });
  if (!s) throw new NotFoundError("AiSuggestion");
  requirePermission(ctx, s.feature === "civic_triage" ? "civic.review" : "reports.read");
  await prisma.aiSuggestion.update({ where: { id: s.id }, data: { accepted } });
  await audit(prisma, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: `ai.suggestion_${accepted ? "accepted" : "dismissed"}`, entityType: s.entityType, entityId: s.entityId, data: { feature: s.feature } });
}

/** Short brief from aggregate KPIs only (no customer names or personal data). */
export async function operationsBrief(ctx: OrgContext, locale: "ar" | "fr" | "en") {
  requirePermission(ctx, "reports.read");
  const to = orgToday(ctx);
  const from = new Date(new Date(`${to}T00:00:00Z`).getTime() - 29 * 86400_000).toISOString().slice(0, 10);
  const k = await businessDashboard(ctx, { from, to });
  const kpis = {
    plannedToday: (k.workOrders.today.PLANNED ?? 0) + (k.workOrders.today.ASSIGNED ?? 0),
    completedToday: k.workOrders.today.COMPLETED ?? 0,
    overdueOpenWorkOrders: k.workOrders.overdue,
    completionRate30d: k.workOrders.completionRate,
    failedAttempts30d: k.workOrders.failed,
    topFailureReason: k.failedByReason.sort((a, b) => b.count - a.count)[0]?.reason ?? null,
    requestsToValidate: k.pendingRequests,
    outstandingReceivablesDZD: k.receivables.outstandingMinor / 100,
    overdueInvoices: k.receivables.overdueCount,
    tonnage30dTonnes: k.tonnage.reduce((s, t) => s + t.netKgMinor, 0) / 100 / 1000,
  };
  const res = await run(() => provider().operationsBrief({ locale, kpis }));
  await prisma.aiSuggestion.create({
    data: { organizationId: ctx.org.id, feature: "ops_brief", entityType: "Organization", entityId: ctx.org.id, model: res.model, output: res.output as Prisma.InputJsonValue, inputTokens: res.inputTokens, outputTokens: res.outputTokens, createdById: ctx.userId },
  });
  return res.output;
}
