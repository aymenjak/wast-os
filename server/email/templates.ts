import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { formatDay, formatMinor } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";

/** Plain, escaped HTML emails (no remote images, no tracking pixels), RTL for Arabic. */
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const loc = (l: string | null | undefined): Locale => (l && isLocale(l) ? l : "fr");

function layout(locale: Locale, title: string, body: string, footer: string) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  return `<!DOCTYPE html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;background:#edefed;font-family:Arial,'Noto Kufi Arabic',sans-serif;color:#1d2a2e">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border:1px solid #d7dcda;border-radius:8px;padding:24px;text-align:${dir === "rtl" ? "right" : "left"}">
<div style="font-weight:700;font-size:18px;margin-bottom:16px">NEXVO</div>${body}</div>
<p style="font-size:12px;color:#5a6b65;margin-top:12px">${esc(footer)}</p></div></body></html>`;
}

const row = (k: string, v: string) => `<tr><td style="padding:4px 0;color:#5a6b65">${esc(k)}</td><td style="padding:4px 8px;font-weight:600">${v}</td></tr>`;
const button = (href: string, label: string) => `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#1f5a44;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;display:inline-block">${esc(label)}</a></p>`;

type Money = string | { toString(): string };
const money = (v: Money, locale: Locale, cur = "DZD") => esc(formatMinor(toMinor(v.toString()), locale, cur));

export function platformInvoiceEmail(l: string, inv: { number: string; total: Money; dueDate: Date; periodStart: Date; periodEnd: Date }, link: string, reminder = false) {
  const locale = loc(l);
  const d = getDictionary(locale);
  const t = d.email;
  const subject = (reminder ? t.reminderSubject : t.platformInvoiceSubject).replace("{number}", inv.number);
  const intro = reminder ? t.reminderIntro : t.platformInvoiceIntro;
  const body = `<p>${esc(intro)}</p><table>${row(d.invoices.number, esc(inv.number))}${row(d.billing.period, `${esc(formatDay(inv.periodStart, locale))} → ${esc(formatDay(inv.periodEnd, locale))}`)}${row(d.invoices.total, money(inv.total, locale))}${row(d.invoices.dueDate, esc(formatDay(inv.dueDate, locale)))}</table>${button(link, t.viewInvoice)}`;
  const text = `${intro}\n${d.invoices.number}: ${inv.number}\n${d.invoices.total}: ${formatMinor(toMinor(inv.total.toString()), locale, "DZD")}\n${d.invoices.dueDate}: ${formatDay(inv.dueDate, locale)}\n${link}`;
  return { subject, html: layout(locale, subject, body, t.footer), text };
}

export function customerInvoiceEmail(
  l: string,
  org: { name: string; email: string | null; phone: string | null },
  inv: { number: string; total: Money; amountPaid: Money; currency: string; issueDate: Date | null; dueDate: Date | null; billToName: string | null; lines: { description: string; quantity: Money; lineTotal: Money }[] },
  message?: string,
) {
  const locale = loc(l);
  const d = getDictionary(locale);
  const t = d.email;
  const subject = t.customerInvoiceSubject.replace("{number}", inv.number).replace("{org}", org.name);
  const balance = (toMinor(inv.total.toString()) - toMinor(inv.amountPaid.toString())).toString();
  const lines = inv.lines.map((x) => `<tr><td style="padding:4px 0">${esc(x.description)}</td><td style="padding:4px 8px">${esc(x.quantity.toString())}</td><td style="padding:4px 0">${money(x.lineTotal, locale, inv.currency)}</td></tr>`).join("");
  const body = `<p>${esc(t.customerInvoiceIntro.replace("{org}", org.name))}</p>${message ? `<p style="white-space:pre-line">${esc(message)}</p>` : ""}
<table>${row(d.invoices.number, esc(inv.number))}${inv.issueDate ? row(d.invoices.issueDate, esc(formatDay(inv.issueDate, locale))) : ""}${inv.dueDate ? row(d.invoices.dueDate, esc(formatDay(inv.dueDate, locale))) : ""}${row(d.invoices.total, money(inv.total, locale, inv.currency))}${row(d.invoices.balance, esc(formatMinor(Number(balance), locale, inv.currency)))}</table>
<table style="width:100%;margin-top:12px;border-top:1px solid #d7dcda">${lines}</table>
<p style="margin-top:16px;font-size:13px">${esc([org.name, org.email, org.phone].filter(Boolean).join(" · "))}</p>`;
  const text = `${t.customerInvoiceIntro.replace("{org}", org.name)}\n${message ?? ""}\n${d.invoices.number}: ${inv.number}\n${d.invoices.total}: ${formatMinor(toMinor(inv.total.toString()), locale, inv.currency)}\n${inv.lines.map((x) => `- ${x.description}: ${formatMinor(toMinor(x.lineTotal.toString()), locale, inv.currency)}`).join("\n")}`;
  return { subject, html: layout(locale, subject, body, t.footerCustomer.replace("{org}", org.name)), text };
}

export function invitationEmail(l: string, org: string, link: string) {
  const locale = loc(l);
  const t = getDictionary(locale).email;
  const subject = t.invitationSubject.replace("{org}", org);
  const body = `<p>${esc(t.invitationIntro.replace("{org}", org))}</p>${button(link, t.invitationCta)}<p style="font-size:13px;color:#5a6b65">${esc(t.linkExpires)}</p>`;
  return { subject, html: layout(locale, subject, body, t.ignoreIfUnexpected), text: `${t.invitationIntro.replace("{org}", org)}\n${link}\n${t.linkExpires}` };
}

export function passwordResetEmail(l: string, link: string) {
  const locale = loc(l);
  const t = getDictionary(locale).email;
  const body = `<p>${esc(t.resetIntro)}</p>${button(link, t.resetCta)}<p style="font-size:13px;color:#5a6b65">${esc(t.resetExpires)}</p>`;
  return { subject: t.resetSubject, html: layout(locale, t.resetSubject, body, t.ignoreIfUnexpected), text: `${t.resetIntro}\n${link}\n${t.resetExpires}` };
}

export function civicUpdateEmail(l: string, municipality: string, trackingCode: string, statusLabel: string, link: string) {
  const locale = loc(l);
  const t = getDictionary(locale).email;
  const subject = t.civicSubject.replace("{code}", trackingCode);
  const body = `<p>${esc(t.civicIntro.replace("{municipality}", municipality))}</p><table>${row(t.civicCode, esc(trackingCode))}${row(t.civicStatus, esc(statusLabel))}</table>${button(link, t.civicCta)}`;
  return { subject, html: layout(locale, subject, body, t.civicFooter), text: `${t.civicIntro.replace("{municipality}", municipality)}\n${trackingCode}: ${statusLabel}\n${link}` };
}
