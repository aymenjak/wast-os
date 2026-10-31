import { z } from "zod";
import { prisma } from "../db";
import { requirePermission, type OrgContext } from "../context";
import { DomainError, NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { email as emailSchema, optionalText, parse } from "../validation";
import { getEmailProvider } from "../email/provider";
import { customerInvoiceEmail } from "../email/templates";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Email outbox: messages are written in the same transaction as the business change (never lost, never sent
 * for a rolled-back change) and delivered by `processOutbox()` (CLI `npm run outbox:work`, every minute, and after
 * each billing run). Retries with exponential backoff; marked failed after 5 attempts. Without SMTP_URL nothing
 * is sent and messages wait in the outbox.
 */
const MAX_ATTEMPTS = 5;
type Db = Prisma.TransactionClient | typeof prisma;

export async function enqueueEmail(db: Db, m: { organizationId: string | null; to: string; type: string; subject: string; html: string; text: string }) {
  await db.notification.create({ data: { organizationId: m.organizationId, channel: "EMAIL", recipient: m.to, type: m.type, payload: { subject: m.subject, html: m.html, text: m.text } } });
}

export async function processOutbox(limit = 50) {
  const provider = getEmailProvider();
  const pending = await prisma.notification.count({ where: { channel: "EMAIL", sentAt: null, failedAt: null } });
  if (!provider) return { skipped: "not_configured" as const, sent: 0, failed: 0, pending };
  // Claim a batch atomically: concurrent workers never send the same message twice.
  const batch = await prisma.$queryRaw<{ id: string; recipient: string; payload: { subject?: string; html?: string; text?: string }; attempts: number }[]>`
    UPDATE "Notification" SET "attempts" = "attempts" + 1, "nextAttemptAt" = now() + interval '10 minutes'
    WHERE "id" IN (
      SELECT "id" FROM "Notification"
      WHERE "channel" = 'EMAIL' AND "sentAt" IS NULL AND "failedAt" IS NULL AND "nextAttemptAt" <= now()
        AND "recipient" IS NOT NULL AND "payload" ? 'subject'
      ORDER BY "createdAt" LIMIT ${limit} FOR UPDATE SKIP LOCKED)
    RETURNING "id", "recipient", "payload", "attempts"`;
  let sent = 0, failed = 0;
  for (const m of batch) {
    try {
      await provider.send({ to: m.recipient, subject: m.payload.subject ?? "", html: m.payload.html ?? "", text: m.payload.text ?? "" });
      await prisma.notification.update({ where: { id: m.id }, data: { sentAt: new Date(), lastError: null } });
      sent++;
    } catch (e) {
      const last = m.attempts >= MAX_ATTEMPTS;
      await prisma.notification.update({
        where: { id: m.id },
        data: { lastError: String(e instanceof Error ? e.message : e).slice(0, 500), nextAttemptAt: new Date(Date.now() + 2 ** m.attempts * 60_000), ...(last ? { failedAt: new Date() } : {}) },
      });
      failed++;
    }
  }
  return { sent, failed, pending: pending - sent };
}

/** Emails an issued invoice to the customer (or another address). Content is the invoice itself, escaped. */
export async function sendInvoiceEmail(ctx: OrgContext, invoiceId: string, input: unknown) {
  requirePermission(ctx, "invoices.write");
  const data = parse(z.object({ to: z.preprocess((v) => (v === "" ? undefined : v), emailSchema.optional()), message: optionalText(1000) }), input);
  const [inv, org] = await Promise.all([
    prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: ctx.org.id }, include: { customer: true, lines: { orderBy: { position: "asc" } } } }),
    prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id } }),
  ]);
  if (!inv) throw new NotFoundError("Invoice");
  if (inv.status === "DRAFT" || inv.status === "VOID" || !inv.number) throw new DomainError("errors.email.invoiceNotIssued");
  const to = data.to ?? inv.customer.email;
  if (!to) throw new DomainError("errors.email.noRecipient");
  const m = customerInvoiceEmail(org.defaultLocale, { name: org.legalName ?? org.name, email: org.email, phone: org.phone }, { ...inv, number: inv.number }, data.message);
  await prisma.$transaction(async (tx) => {
    await enqueueEmail(tx, { organizationId: ctx.org.id, to, type: "invoice.sent", ...m });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "invoice.emailed", entityType: "Invoice", entityId: inv.id, data: { to } });
  });
  return { to, queued: true, deliveryConfigured: !!getEmailProvider() };
}

/** Owners/admins and the organization's contact address: who receives NEXVO billing emails. */
export async function billingRecipients(db: Db, organizationId: string) {
  const [org, members] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { email: true, defaultLocale: true } }),
    db.membership.findMany({ where: { organizationId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] }, user: { disabledAt: null } }, select: { user: { select: { email: true } } } }),
  ]);
  const all = [org.email, ...members.map((m) => m.user.email)].filter((x): x is string => !!x).map((x) => x.toLowerCase());
  return { to: [...new Set(all)], locale: org.defaultLocale };
}
