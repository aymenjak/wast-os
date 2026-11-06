"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { previewCustomerImportAction, importCustomersAction } from "@/app/actions/business";
import type { ImportPreview } from "@/server/services/customer-import";

const TEMPLATE: Record<string, string[]> = {
  fr: ["Nom du client", "Type", "NIF", "Email", "Téléphone", "Adresse de facturation", "Nom du site", "Adresse", "Commune", "Wilaya", "Latitude", "Longitude", "Notes d’accès"],
  en: ["Customer name", "Type", "NIF", "Email", "Phone", "Billing address", "Site name", "Address", "Commune", "Wilaya", "Latitude", "Longitude", "Access notes"],
  ar: ["اسم الزبون", "النوع", "الرقم الجبائي", "البريد", "الهاتف", "عنوان الفوترة", "اسم الموقع", "العنوان", "البلدية", "الولاية", "خط العرض", "خط الطول", "ملاحظات الوصول"],
};
const SAMPLE_KIND: Record<string, string> = { fr: "entreprise", en: "business", ar: "شركة" };

/** Two steps: check (nothing written), then import all or nothing. The file is read in the browser and sent as text. */
export function CustomerImport() {
  const { dict: d, locale, t } = useI18n();
  const c = d.customers;
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const fieldLabel = (f: string) => ({
    name: d.common.name, kind: c.kind, taxId: c.taxId, email: d.common.email, phone: d.common.phone, billingAddress: c.billingAddress,
    label: c.site, addressLine: d.common.address, commune: d.common.commune, wilaya: d.common.wilaya, latitude: d.common.latitude, longitude: d.common.longitude, accessNotes: c.site,
  } as Record<string, string>)[f] ?? f;
  const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

  function template() {
    const head = TEMPLATE[locale] ?? TEMPLATE.fr!;
    const row = [c.sampleName, SAMPLE_KIND[locale] ?? "entreprise", "", "", "", "", "", "", "", "", "", "", ""];
    const esc = (x: string) => (/[;"\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);
    const blob = new Blob(["﻿" + [head, row].map((r) => r.map(esc).join(";")).join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nexvo-customers.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(null); setMessage(null);
    if (!f) { setCsv(null); return; }
    setFileName(f.name);
    setCsv(await f.text());
  }

  function check() {
    if (!csv) return;
    start(async () => {
      setMessage(null);
      const r = await previewCustomerImportAction(locale, csv);
      if (!r.ok) { setPreview(null); setMessage({ tone: "danger", text: t(r.error) }); return; }
      setPreview(r.preview ?? null);
      if (r.preview?.missingName) setMessage({ tone: "danger", text: d.errors.import.missingName });
    });
  }

  function doImport() {
    if (!csv) return;
    start(async () => {
      const r = await importCustomersAction(locale, csv);
      if (!r.ok) { setMessage({ tone: "danger", text: t(r.error) }); return; }
      setPreview(null); setCsv(null); setFileName("");
      setMessage({ tone: "success", text: fill(c.imported, r.imported ?? { customers: 0, locations: 0, skipped: 0 }) });
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-ink-700">{c.importHowTo}</p>
      <div className="flex flex-wrap items-end gap-3">
        <button type="button" onClick={template} className={buttonClass("secondary", "md")}>{c.downloadTemplate}</button>
        <label className="block text-sm font-medium text-ink-800">
          {c.chooseFile}
          <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="mt-1 block text-sm" />
        </label>
        <button type="button" onClick={check} disabled={!csv || pending} className={buttonClass("primary", "md")}>{pending ? d.common.loading : c.checkFile}</button>
      </div>
      {message ? <p role={message.tone === "danger" ? "alert" : "status"} className={`rounded-[var(--radius-card)] px-4 py-3 text-sm ${message.tone === "danger" ? "bg-danger-100 text-danger-700" : "bg-success-100 text-success-700"}`}>
        {message.text}{message.tone === "success" ? <> <Link className="font-semibold underline" href={`/${locale}/app/customers`}>{c.title}</Link></> : null}
      </p> : null}
      {preview && !preview.missingName ? (
        <section aria-live="polite" className="space-y-3">
          <p className="text-sm font-medium text-ink-900"><bdi>{fileName}</bdi> · {fill(c.previewSummary, { customers: preview.customers, locations: preview.locations, skipped: preview.skipped, errors: preview.errors })}</p>
          {preview.unknownColumns.length ? <p className="text-xs text-ink-600">{c.unknownColumns}: {preview.unknownColumns.join(", ")}</p> : null}
          {preview.errors ? <p role="alert" className="rounded-[var(--radius-card)] bg-warning-100 px-4 py-3 text-sm text-warning-700">{c.fixFirst}</p> : null}
          {preview.customers && !preview.errors ? (
            <button type="button" onClick={doImport} disabled={pending} className={buttonClass("primary", "lg")}>{pending ? d.common.loading : c.importNow.replace("{n}", String(preview.customers))}</button>
          ) : null}
          <div tabIndex={0} className="overflow-x-auto rounded-[var(--radius-card)] border border-ink-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-start text-xs text-ink-600"><tr><th className="px-3 py-2 text-start">{c.line}</th><th className="px-3 py-2 text-start">{d.common.name}</th><th className="px-3 py-2 text-start">{c.site}</th><th className="px-3 py-2 text-start">{d.common.status}</th><th className="px-3 py-2 text-start">{c.problems}</th></tr></thead>
              <tbody>{[...preview.rows].sort((a, b) => (a.status === "error" ? -1 : 0) - (b.status === "error" ? -1 : 0) || a.line - b.line).slice(0, 300).map((r) => (
                <tr key={r.line} className="border-t border-ink-100">
                  <td className="num px-3 py-2">{r.line}</td>
                  <td className="px-3 py-2">{r.name || "—"}</td>
                  <td className="px-3 py-2">{r.site ?? "—"}</td>
                  <td className="px-3 py-2"><Badge tone={r.status === "error" ? "danger" : r.status === "exists" ? "neutral" : "success"}>{r.status === "error" ? c.statusError : r.status === "exists" ? c.statusExists : c.statusNew}</Badge></td>
                  <td className="px-3 py-2 text-danger-700">{r.errors.map(fieldLabel).join(", ")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
