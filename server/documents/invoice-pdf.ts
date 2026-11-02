import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../db";
import type { OrgContext } from "../context";
import { NotFoundError } from "../domain/errors";
import { getInvoice } from "../services/invoices";
import { htmlToPdf } from "../pdf";
import { esc, loc } from "../email/templates";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { formatDay, formatMinor } from "@/lib/i18n/format";
import { toMinor } from "@/lib/money";

/** Self-contained invoice HTML for PDF rendering: fonts embedded, no external resources. */
let fontCss: string | null = null;
function fonts() {
  if (fontCss !== null) return fontCss;
  const f = (pkg: string, file: string) => {
    try {
      return readFileSync(path.join(process.cwd(), "node_modules", pkg, "files", file)).toString("base64");
    } catch {
      return null;
    }
  };
  const kufi = f("@fontsource-variable/noto-kufi-arabic", "noto-kufi-arabic-arabic-wght-normal.woff2");
  const archivo = f("@fontsource-variable/archivo", "archivo-latin-wght-normal.woff2");
  fontCss = [
    kufi && `@font-face{font-family:Kufi;src:url(data:font/woff2;base64,${kufi}) format("woff2");font-weight:100 900}`,
    archivo && `@font-face{font-family:Archivo;src:url(data:font/woff2;base64,${archivo}) format("woff2");font-weight:100 900}`,
  ].filter(Boolean).join("");
  return fontCss;
}

type Party = { name?: string | null; address?: string | null; taxId?: string | null; tradeRegister?: string | null; statId?: string | null };
const ids = (p: Party) => [p.taxId && `NIF ${p.taxId}`, p.tradeRegister && `RC ${p.tradeRegister}`, p.statId && `NIS ${p.statId}`].filter(Boolean).join(" · ");

function doc(locale: Locale, o: {
  title: string; number: string; issuer: Party; billTo: Party; issueDate: Date | null; dueDate: Date | null; currency: string;
  lines: { description: string; qty: string; total: string | { toString(): string } }[]; subtotal: unknown; tax: unknown; total: unknown; paid?: unknown; status: string; note: string;
}) {
  const d = getDictionary(locale);
  const m = (v: unknown) => esc(formatMinor(toMinor(String(v)), locale, o.currency));
  const dir = locale === "ar" ? "rtl" : "ltr";
  const end = dir === "rtl" ? "left" : "right";
  const party = (p: Party) => `<div style="font-weight:700">${esc(p.name)}</div>${p.address ? `<div>${esc(p.address)}</div>` : ""}<div dir="ltr" style="font-size:11px">${esc(ids(p))}</div>`;
  return `<!DOCTYPE html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><style>${fonts()}
body{font-family:Archivo,Kufi,sans-serif;color:#1d2a2e;font-size:12px;margin:0}
h1{font-size:26px;margin:0}table{width:100%;border-collapse:collapse}th,td{padding:6px 4px;border-bottom:1px solid #d7dcda;text-align:start}
.num{text-align:${end};white-space:nowrap}.muted{color:#5a6b65}</style></head><body>
<div style="display:flex;justify-content:space-between;border-bottom:2px solid #1d2a2e;padding-bottom:12px">
<div><div style="font-weight:800;font-size:16px;margin-bottom:6px">NEXVO</div>${party(o.issuer)}</div>
<div style="text-align:${end}"><h1>${esc(o.title)}</h1><div dir="ltr" style="font-weight:700">${esc(o.number)}</div>
${o.issueDate ? `<div class="muted">${esc(d.invoices.issueDate)}: ${esc(formatDay(o.issueDate, locale))}</div>` : ""}
${o.dueDate ? `<div class="muted">${esc(d.invoices.dueDate)}: ${esc(formatDay(o.dueDate, locale))}</div>` : ""}</div></div>
<div style="margin:16px 0"><div class="muted" style="font-size:11px">${esc(d.billing.billTo)}</div>${party(o.billTo)}</div>
<table><thead><tr><th>${esc(d.invoices.description)}</th><th class="num">${esc(d.invoices.quantity)}</th><th class="num">${esc(d.invoices.total)}</th></tr></thead><tbody>
${o.lines.map((l) => `<tr><td>${esc(l.description)}</td><td class="num">${esc(l.qty)}</td><td class="num">${m(l.total)}</td></tr>`).join("")}</tbody></table>
<table style="width:45%;margin-${end === "right" ? "left" : "right"}:auto;margin-top:12px">
<tr><td class="muted">${esc(d.invoices.subtotal)}</td><td class="num">${m(o.subtotal)}</td></tr>
<tr><td class="muted">${esc(d.invoices.tax)}</td><td class="num">${m(o.tax)}</td></tr>
<tr><td style="font-weight:700">${esc(d.invoices.total)}</td><td class="num" style="font-weight:700">${m(o.total)}</td></tr>
${o.paid !== undefined ? `<tr><td class="muted">${esc(d.invoices.paid)}</td><td class="num">${m(o.paid)}</td></tr>` : ""}</table>
<p style="margin-top:14px;font-weight:700">${esc(o.status)}</p><p class="muted" style="margin-top:24px;font-size:10px">${esc(o.note)}</p></body></html>`;
}

/** Customer invoice issued by a collection company (tenant-scoped through getInvoice, incl. portal rules). */
export async function tenantInvoicePdf(ctx: OrgContext, invoiceId: string) {
  await getInvoice(ctx, invoiceId); // authorization and tenant/portal scoping
  return renderTenantInvoicePdf(ctx.org.id, invoiceId);
}

/** System use (email attachments): the caller has already authorised access. */
export async function renderTenantInvoicePdf(organizationId: string, invoiceId: string) {
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, organizationId }, include: { customer: true, lines: { orderBy: { position: "asc" } } } });
  if (!inv || inv.status === "DRAFT" || !inv.number) throw new NotFoundError("Invoice");
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const locale = loc(org.defaultLocale);
  const d = getDictionary(locale);
  const html = doc(locale, {
    title: d.billing.invoiceTitle, number: inv.number, currency: inv.currency, issueDate: inv.issueDate, dueDate: inv.dueDate,
    issuer: { name: org.legalName ?? org.name, address: org.address, taxId: org.taxId, tradeRegister: org.tradeRegister, statId: org.statisticalId },
    billTo: { name: inv.billToName ?? inv.customer.name, address: inv.billToAddress, taxId: inv.billToTaxId },
    lines: inv.lines.map((l) => ({ description: l.description, qty: l.quantity.toString(), total: l.lineTotal })),
    subtotal: inv.subtotal, tax: inv.taxTotal, total: inv.total, paid: inv.amountPaid, status: d.enums.InvoiceStatus[inv.status], note: d.billing.legalNote,
  });
  return { pdf: await htmlToPdf(html), filename: `${inv.number}.pdf` };
}

/** NEXVO subscription invoice (organization owners/admins only, enforced by the caller). */
export async function platformInvoicePdf(invoiceId: string, organizationId: string) {
  const inv = await prisma.platformInvoice.findFirst({ where: { id: invoiceId, organizationId }, include: { organization: { select: { defaultLocale: true } } } });
  if (!inv) throw new NotFoundError("PlatformInvoice");
  const locale = loc(inv.organization.defaultLocale);
  const d = getDictionary(locale);
  const html = doc(locale, {
    title: d.billing.invoiceTitle, number: inv.number, currency: inv.currency, issueDate: inv.issueDate, dueDate: inv.dueDate,
    issuer: inv.issuer as Party, billTo: inv.billTo as Party,
    lines: [{ description: `${d.billing.lineLabel.replace("{plan}", inv.planCode).replace("{cycle}", d.billing.cycles[inv.cycle])} (${formatDay(inv.periodStart, locale)} → ${formatDay(inv.periodEnd, locale)})`, qty: "1", total: inv.subtotal }],
    subtotal: inv.subtotal, tax: inv.taxTotal, total: inv.total, status: d.billing.status[inv.status], note: d.billing.legalNote,
  });
  return { pdf: await htmlToPdf(html), filename: `${inv.number}.pdf` };
}
