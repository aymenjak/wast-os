import nodemailer from "nodemailer";

/** Outgoing email. Off unless SMTP_URL is configured (e.g. smtps://user:pass@smtp.example.dz:465). */
export type OutgoingEmail = { to: string; subject: string; html: string; text: string; attachments?: { filename: string; content: Buffer; contentType: string }[] };
export interface EmailProvider {
  send(m: OutgoingEmail): Promise<void>;
}

class SmtpProvider implements EmailProvider {
  // Timeouts can be set as URL parameters if needed; defaults come from nodemailer.
  private transport = nodemailer.createTransport(process.env.SMTP_URL!);
  async send(m: OutgoingEmail) {
    await this.transport.sendMail({ from: process.env.MAIL_FROM ?? "NEXVO <no-reply@nexvo.invalid>", to: m.to, subject: m.subject, html: m.html, text: m.text, attachments: m.attachments });
  }
}

let provider: EmailProvider | null | undefined;
export function getEmailProvider(): EmailProvider | null {
  if (provider !== undefined) return provider;
  provider = process.env.SMTP_URL ? new SmtpProvider() : null;
  return provider;
}
/** Test seam. */
export function setEmailProvider(p: EmailProvider | null) {
  provider = p;
}
