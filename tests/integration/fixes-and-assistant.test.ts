import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { addMember, isoDay, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createSessionRecord, inviteMember, login, resolveSession } from "@/server/services/accounts";
import { requestPasswordReset, resetPassword, resetTokenValid } from "@/server/services/password-reset";
import { processOutbox, sendInvoiceEmail } from "@/server/services/mailer";
import { setEmailProvider, type OutgoingEmail } from "@/server/email/provider";
import { runRetention } from "@/server/services/retention";
import { createCustomer } from "@/server/services/customers";
import { addManualLine, createDraftInvoice, issueInvoice } from "@/server/services/invoices";
import { tenantInvoicePdf } from "@/server/documents/invoice-pdf";
import { submitCivicReport, reviewCivicReport } from "@/server/services/civic";
import { deleteConversation, getConversation, listConversations, sendChatMessage, setAiChatEnabled } from "@/server/services/ai-chat";
import { setAiProvider, type AiProvider, type ChatInput } from "@/server/ai/provider";
import type { OrgContext } from "@/server/context";

const sent: OutgoingEmail[] = [];
let a: Awaited<ReturnType<typeof newOrg>>;
let b: Awaited<ReturnType<typeof newOrg>>;
const linkIn = (m: OutgoingEmail) => m.text.match(/https?:\/\/\S+|\/(?:fr|ar|en)\/\S+/)?.[0] ?? "";

beforeAll(async () => {
  await resetDb();
  a = await newOrg("SERVICE_PROVIDER", "Alpha");
  b = await newOrg("SERVICE_PROVIDER", "Beta");
  setEmailProvider({ async send(m) { sent.push(m); } });
});
afterAll(() => { setEmailProvider(null); setAiProvider(null); });

describe("password reset", () => {
  it("unknown emails get the same silent outcome and nothing is queued", async () => {
    const before = await prisma.notification.count();
    await requestPasswordReset({ email: "nobody@example.test" });
    expect(await prisma.notification.count()).toBe(before);
  });

  it("emails a single-use 30-minute link; a new request invalidates the old one; body erased after sending", async () => {
    await requestPasswordReset({ email: a.user.email, locale: "fr" });
    await requestPasswordReset({ email: a.user.email, locale: "fr" });
    await processOutbox();
    const mails = sent.filter((m) => m.to === a.user.email);
    const tokens = mails.map((m) => linkIn(m).split("/reset/")[1]!);
    const valid = await Promise.all(tokens.map((t) => resetTokenValid(t)));
    // Both emails left in the same millisecond, so send order is not guaranteed: exactly one link must still work.
    expect(valid.filter(Boolean)).toHaveLength(1);
    const fresh = tokens[valid.indexOf(true)]!;
    const n = await prisma.notification.findFirstOrThrow({ where: { recipient: a.user.email, type: "password.reset", sentAt: { not: null } } });
    expect(JSON.stringify(n.payload)).not.toContain("/reset/");
    // Lockout and sessions are cleared; the new password works once.
    const session = await createSessionRecord(prisma, a.user.id, a.org.id);
    await prisma.user.update({ where: { id: a.user.id }, data: { lockedUntil: new Date(Date.now() + 600_000) } });
    await resetPassword({ token: fresh, password: "a-brand-new-password-42" });
    expect(await resolveSession(session)).toBeNull();
    await expect(resetPassword({ token: fresh, password: "another-password-99" })).rejects.toThrow("errors.auth.resetInvalid");
    await expect(login({ email: a.user.email, password: "a-brand-new-password-42" })).resolves.toHaveProperty("token");
  });

  it("expired links are refused", async () => {
    await requestPasswordReset({ email: b.user.email });
    await processOutbox();
    const token = linkIn(sent.filter((m) => m.to === b.user.email).at(-1)!).split("/reset/")[1]!;
    await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(resetPassword({ token, password: "whatever-password-1" })).rejects.toThrow("errors.auth.resetInvalid");
  });
});

describe("emails that were queued without template", () => {
  it("invitation email carries the link, then is redacted", async () => {
    await inviteMember(a.ctx, { email: "newbie@example.test", role: "DISPATCHER" });
    await processOutbox();
    const m = sent.find((x) => x.to === "newbie@example.test")!;
    expect(m.subject).toContain("Alpha");
    expect(m.text).toMatch(/\/invite\/[A-Za-z0-9_-]{40,}/);
    const n = await prisma.notification.findFirstOrThrow({ where: { recipient: "newbie@example.test" } });
    expect(JSON.stringify(n.payload)).not.toContain("/invite/");
  });

  it("citizens get an email only when they left an email address", async () => {
    const m = await newOrg("MUNICIPALITY", "APC Mail");
    for (const contact of ["citoyen@example.test", "0550 00 00 00"]) {
      await submitCivicReport({ municipality: m.org.slug, category: "OVERFLOWING_BIN", description: "Bac plein (test)", latitude: "36.7", longitude: "3.0", reporterContact: contact, clientSubmissionId: randomUUID() });
    }
    for (const r of await prisma.civicReport.findMany({ where: { organizationId: m.org.id } })) await reviewCivicReport(m.ctx, r.id, { to: "UNDER_REVIEW" });
    const queued = await prisma.notification.findMany({ where: { organizationId: m.org.id, type: "civic.status_changed" } });
    expect(queued.map((q) => q.recipient)).toEqual(["citoyen@example.test"]);
  });
});

describe("PDF invoices", () => {
  let invoiceId: string;
  it("renders a real PDF for an issued invoice, tenant-scoped, and attaches it to the email", async () => {
    const c = await createCustomer(a.ctx, { name: "Client PDF", email: "pdf@example.test" });
    const d = await createDraftInvoice(a.ctx, { customerId: c.id, workOrderIds: [] });
    await addManualLine(a.ctx, d.id, { description: "جمع النفايات — Collecte", quantity: "2", unitPrice: "1500", taxRateBps: 1900 });
    await expect(tenantInvoicePdf(a.ctx, d.id)).rejects.toThrow();
    await issueInvoice(a.ctx, d.id, { issueDate: isoDay(0), dueDate: isoDay(15) });
    invoiceId = d.id;
    const { pdf, filename } = await tenantInvoicePdf(a.ctx, d.id);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(filename).toMatch(/^INV-.*\.pdf$/);
    await expect(tenantInvoicePdf(b.ctx, d.id)).rejects.toThrow(/not found|NotFound/i);
    await sendInvoiceEmail(a.ctx, d.id, {});
    await processOutbox();
    const mail = sent.find((m) => m.to === "pdf@example.test")!;
    expect(mail.attachments?.[0]?.contentType).toBe("application/pdf");
    expect(mail.attachments?.[0]?.content.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60_000);

  it("portal users get PDFs of their own invoices only", async () => {
    const own = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const other = await createCustomer(a.ctx, { name: "Autre" });
    const portalOwn = await addMember(a.ctx, "CUSTOMER_PORTAL", own.customerId);
    const portalOther = await addMember(a.ctx, "CUSTOMER_PORTAL", other.id);
    await expect(tenantInvoicePdf(portalOwn, invoiceId)).resolves.toHaveProperty("filename");
    await expect(tenantInvoicePdf(portalOther, invoiceId)).rejects.toThrow();
  }, 60_000);
});

describe("retention", () => {
  it("deletes data older than the windows and keeps recent data", async () => {
    await prisma.rateLimitBucket.create({ data: { key: "old-bucket", count: 1, resetAt: new Date(Date.now() - 1000) } });
    await prisma.notification.updateMany({ where: { sentAt: { not: null } }, data: { sentAt: new Date(Date.now() - 200 * 86400_000) } });
    const conv = await prisma.aiConversation.create({ data: { organizationId: a.org.id, userId: a.user.id, title: "old", updatedAt: new Date(Date.now() - 100 * 86400_000) } });
    const r = await runRetention();
    expect(r.emails).toBeGreaterThan(0);
    expect(r.rateLimitBuckets).toBeGreaterThanOrEqual(1);
    expect(await prisma.aiConversation.findUnique({ where: { id: conv.id } })).toBeNull();
    expect(await prisma.auditEvent.count({ where: { action: "platform.retention_run" } })).toBe(1);
  });
});

describe("AI assistant", () => {
  let calls: ChatInput[] = [];
  let script: { tool: string; input?: unknown }[] = [];
  const fake: AiProvider = {
    async triageCivicReport() { throw new Error("n/a"); },
    async operationsBrief() { throw new Error("n/a"); },
    async chat(input) {
      calls.push(input);
      const results: string[] = [];
      for (const s of script) results.push((await input.execute(s.tool, s.input ?? {})).content);
      return { text: `ANSWER ${results.join(" | ")}`, toolsUsed: script.map((s) => s.tool), model: "fake", inputTokens: 1, outputTokens: 1 };
    },
  };

  it("is off until an owner/admin turns it on; portal users and support sessions are refused", async () => {
    setAiProvider(fake);
    await expect(sendChatMessage(a.ctx, { message: "bonjour" }, "fr")).rejects.toThrow("errors.ai.chatDisabled");
    const driver = await addMember(a.ctx, "FIELD_WORKER");
    await expect(setAiChatEnabled(driver, true)).rejects.toThrow();
    await setAiChatEnabled(a.ctx, true);
    const portalCustomer = await createCustomer(a.ctx, { name: "Portail" });
    await expect(sendChatMessage(await addMember(a.ctx, "CUSTOMER_PORTAL", portalCustomer.id), { message: "x" }, "fr")).rejects.toThrow();
    await expect(sendChatMessage({ ...a.ctx, support: { grantId: "g", expiresAt: new Date() } } as OrgContext, { message: "x" }, "fr")).rejects.toThrow();
    setAiProvider(null);
    await expect(sendChatMessage(a.ctx, { message: "x" }, "fr")).rejects.toThrow("errors.ai.disabled");
    setAiProvider(fake);
  });

  it("tools run with the user's permissions and tenant: a field worker cannot read invoices", async () => {
    await createCustomer(b.ctx, { name: "Secret Beta Client" });
    script = [{ tool: "search_records", input: { query: "Secret" } }, { tool: "list_overdue_invoices" }];
    const owner = await sendChatMessage(a.ctx, { message: "Factures en retard ?" }, "fr");
    expect(owner.reply).not.toContain("Secret Beta Client");
    expect(owner.reply).toContain("overdue");
    const driver = await addMember(a.ctx, "FIELD_WORKER");
    calls = [];
    const r = await sendChatMessage(driver, { message: "factures ?" }, "ar");
    expect(r.reply).toContain("tool_not_available_for_this_role");
    expect(calls[0]!.tools.map((t) => t.name)).not.toContain("list_overdue_invoices");
    expect(calls[0]!.system).toContain("Arabic");
    expect(calls[0]!.system).toMatch(/read-only/i);
  });

  it("invalid tool input is rejected, conversations keep history and stay private", async () => {
    script = [{ tool: "list_work_orders", input: { date: "not-a-date" } }];
    const first = await sendChatMessage(a.ctx, { message: "Planning du jour ?" }, "fr");
    expect(first.reply).toContain("invalid_input");
    script = [];
    calls = [];
    await sendChatMessage(a.ctx, { conversationId: first.conversationId, message: "Et demain ?" }, "fr");
    expect(calls[0]!.history.map((h) => h.role)).toEqual(["user", "assistant", "user"]);
    const other = await addMember(a.ctx, "ADMIN");
    await expect(getConversation(other, first.conversationId)).rejects.toThrow(/not found|NotFound/i);
    await expect(sendChatMessage(other, { conversationId: first.conversationId, message: "x" }, "fr")).rejects.toThrow(/not found|NotFound/i);
    await expect(getConversation(b.ctx, first.conversationId)).rejects.toThrow();
    expect((await listConversations(a.ctx)).length).toBeGreaterThanOrEqual(2);
    const log = await prisma.auditEvent.findFirstOrThrow({ where: { action: "ai.chat_message", entityId: first.conversationId } });
    expect(JSON.stringify(log.data)).not.toContain("Planning");
    await deleteConversation(a.ctx, first.conversationId);
    await expect(getConversation(a.ctx, first.conversationId)).rejects.toThrow();
  });
});

describe("CLI commands run outside Next.js", () => {
  it("retention:run and outbox:work start and finish (react-server condition)", () => {
    const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL };
    expect(execSync("npm run -s retention:run", { env, encoding: "utf8" })).toContain("vehiclePositions");
    expect(execSync("npm run -s outbox:work", { env: { ...env, SMTP_URL: "" }, encoding: "utf8" })).toContain("pending");
  }, 60_000);
});
