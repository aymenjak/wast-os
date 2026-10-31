import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { submitCivicReport } from "@/server/services/civic";
import { aiEnabled, operationsBrief, recordAiDecision, suggestCivicTriage } from "@/server/services/ai";
import { AiUnavailableError, setAiProvider, type AiProvider, type BriefInput, type TriageInput } from "@/server/ai/provider";
import type { OrgContext } from "@/server/context";

/** AI assistance with a fake provider: data minimisation, permissions, human decision, failure modes. */
const seen: { triage: TriageInput[]; brief: BriefInput[] } = { triage: [], brief: [] };
let mode: "ok" | "refusal" = "ok";
const fake: AiProvider = {
  async triageCivicReport(input) {
    seen.triage.push(input);
    if (mode === "refusal") throw new AiUnavailableError("refusal");
    return { output: { category: "OVERFLOWING_BIN", priority: "HIGH", likelyDuplicate: false, rationale: "Bin overflowing", publicNoteDraft: "Merci" }, model: "fake", inputTokens: 10, outputTokens: 5 };
  },
  async operationsBrief(input) {
    seen.brief.push(input);
    return { output: { headline: "Calm day", points: ["0 overdue"] }, model: "fake", inputTokens: 10, outputTokens: 5 };
  },
};
let muni: OrgContext;
let provider: OrgContext;
let reportId: string;

beforeAll(async () => {
  await resetDb();
  const m = await newOrg("MUNICIPALITY");
  muni = m.ctx;
  provider = (await newOrg()).ctx;
  await submitCivicReport({
    municipality: m.org.slug, category: "OVERFLOWING_BIN", description: "Bac plein devant le 12 rue Didouche, appelez Ali au 0550 00 00 00",
    latitude: "36.7650", longitude: "3.0500", reporterName: "Ali Synthétique", reporterContact: "ali@example.test", clientSubmissionId: randomUUID(),
  });
  reportId = (await prisma.civicReport.findFirstOrThrow({ where: { organizationId: muni.org.id } })).id;
});
afterAll(() => setAiProvider(null));

describe("AI disabled", () => {
  it("everything is off without a provider", async () => {
    setAiProvider(null);
    expect(aiEnabled()).toBe(false);
    await expect(suggestCivicTriage(muni, reportId, "fr")).rejects.toThrow("errors.ai.disabled");
  });
});

describe("civic triage suggestion", () => {
  beforeAll(() => setAiProvider(fake));

  it("sends no reporter identity or coordinates and stores the suggestion", async () => {
    const r = await suggestCivicTriage(muni, reportId, "ar");
    expect(r.category).toBe("OVERFLOWING_BIN");
    const sent = JSON.stringify(seen.triage.at(-1));
    expect(sent).not.toContain("Ali Synthétique");
    expect(sent).not.toContain("ali@example.test");
    expect(sent).not.toContain("36.765");
    expect(Object.keys(seen.triage.at(-1)!).sort()).toEqual(["addressHint", "description", "locale", "nearbyOpenSameCategory", "photoCount", "submittedCategory"]);
    const s = await prisma.aiSuggestion.findUniqueOrThrow({ where: { id: r.id } });
    expect(s.organizationId).toBe(muni.org.id);
    expect(s.accepted).toBeNull();
  });

  it("never changes the report by itself", async () => {
    const before = await prisma.civicReport.findUniqueOrThrow({ where: { id: reportId } });
    await suggestCivicTriage(muni, reportId, "fr");
    const after = await prisma.civicReport.findUniqueOrThrow({ where: { id: reportId } });
    expect(after.status).toBe(before.status);
    expect(after.category).toBe(before.category);
  });

  it("other tenants and roles without civic.review are refused", async () => {
    await expect(suggestCivicTriage(provider, reportId, "fr")).rejects.toThrow();
    const viewer = await addMember(muni, "VIEWER");
    await expect(suggestCivicTriage(viewer, reportId, "fr")).rejects.toThrow();
  });

  it("the human decision is recorded and audited, tenant-scoped", async () => {
    const s = await prisma.aiSuggestion.findFirstOrThrow({ where: { organizationId: muni.org.id } });
    await expect(recordAiDecision(provider, { suggestionId: s.id, accepted: true })).rejects.toThrow(/not found|NotFound/i);
    const viewer = await addMember(muni, "VIEWER");
    await expect(recordAiDecision(viewer, { suggestionId: s.id, accepted: false })).rejects.toThrow();
    await recordAiDecision(muni, { suggestionId: s.id, accepted: "true" });
    expect((await prisma.aiSuggestion.findUniqueOrThrow({ where: { id: s.id } })).accepted).toBe(true);
    expect(await prisma.auditEvent.count({ where: { organizationId: muni.org.id, action: "ai.suggestion_accepted" } })).toBe(1);
  });

  it("a refusal is surfaced as a typed error, nothing stored", async () => {
    mode = "refusal";
    const before = await prisma.aiSuggestion.count();
    await expect(suggestCivicTriage(muni, reportId, "fr")).rejects.toThrow("errors.ai.refusal");
    expect(await prisma.aiSuggestion.count()).toBe(before);
    mode = "ok";
  });
});

describe("operations brief", () => {
  it("receives aggregate numbers only", async () => {
    setAiProvider(fake);
    const r = await operationsBrief(provider, "fr");
    expect(r.headline).toBe("Calm day");
    for (const v of Object.values(seen.brief.at(-1)!.kpis)) expect(["number", "string"].includes(typeof v) || v === null).toBe(true);
    const driver = await addMember(provider, "FIELD_WORKER");
    await expect(operationsBrief(driver, "fr")).rejects.toThrow();
  });
});
