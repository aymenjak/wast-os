import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { newOrg, resetDb } from "../helpers/db";
import { createCustomer } from "@/server/services/customers";
import { addManualLine, createDraftInvoice, issueInvoice } from "@/server/services/invoices";
import { chatAvailability, sendChatMessage, setAiChatEnabled } from "@/server/services/ai-chat";
import { demoProviderEnabled } from "@/server/ai/demo-provider";
import { setAiProvider } from "@/server/ai/provider";
import type { OrgContext } from "@/server/context";

/** The local demo stand-in: localhost only, visible flag, answers from real tool data. */
let ctx: OrgContext;
const env = { ...process.env };
afterEach(() => { process.env.AI_DEMO_PROVIDER = env.AI_DEMO_PROVIDER; process.env.APP_URL = env.APP_URL; });

beforeAll(async () => {
  await resetDb();
  setAiProvider(null);
  ctx = (await newOrg()).ctx;
  await setAiChatEnabled(ctx, true);
  const c = await createCustomer(ctx, { name: "Hôtel Démo Retard" });
  const d = await createDraftInvoice(ctx, { customerId: c.id, workOrderIds: [] });
  await addManualLine(ctx, d.id, { description: "Collecte", quantity: "1", unitPrice: "1000", taxRateBps: 1900 });
  await issueInvoice(ctx, d.id, { issueDate: "2026-09-01", dueDate: "2026-09-15" });
});

describe("assistant demo mode", () => {
  it("is never active on a real domain or without the flag (fail closed)", async () => {
    process.env.AI_DEMO_PROVIDER = "1"; process.env.APP_URL = "https://app.nexvo.dz";
    expect(demoProviderEnabled()).toBe(false);
    process.env.AI_DEMO_PROVIDER = ""; process.env.APP_URL = "http://localhost:3000";
    expect(demoProviderEnabled()).toBe(false);
    await expect(sendChatMessage(ctx, { message: "factures ?" }, "fr")).rejects.toThrow("errors.ai.disabled");
  });

  it("on localhost with the flag: flagged as demo and answers from the real overdue invoice", async () => {
    process.env.AI_DEMO_PROVIDER = "1"; process.env.APP_URL = "http://localhost:3000";
    expect((await chatAvailability(ctx)).demo).toBe(true);
    const r = await sendChatMessage(ctx, { message: "Quelles factures sont en retard ?" }, "fr");
    expect(r.toolsUsed).toEqual(["list_overdue_invoices"]);
    expect(r.reply).toContain("Hôtel Démo Retard");
    expect(r.reply).toMatch(/1\s190,00/u); // narrow no-break space from Intl
  });
});
