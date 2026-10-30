"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { LocationPicker } from "@/components/map/location-picker";
import { useI18n } from "@/components/i18n-provider";
import { submitReportAction } from "@/app/actions/public";

const CATEGORIES = ["ILLEGAL_DUMPING", "OVERFLOWING_BIN", "MISSED_COLLECTION", "SANITATION", "OTHER"] as const;

export function ReportForm({ municipalities }: { municipalities: { slug: string; name: string }[] }) {
  const { t, locale } = useI18n();
  // One id per form instance: a retried submission (double tap, flaky network) is deduplicated server-side.
  const clientSubmissionId = useMemo(() => crypto.randomUUID(), []);
  const [code, setCode] = useState<string | null>(null);

  if (code)
    return (
      <div role="status" className="mt-8 rounded-[var(--radius-card)] border border-success-100 bg-success-100/40 p-6">
        <div className="flex items-center gap-2 font-semibold text-success-700"><CheckCircle2 aria-hidden className="size-5" />{t("civic.submitted")}</div>
        <p className="mt-2 text-sm text-ink-700">{t("civic.submittedLead")}</p>
        <p className="mt-4 text-xs text-ink-500">{t("civic.trackingCode")}</p>
        <p data-testid="tracking-code" className="num mt-1 text-2xl font-semibold tracking-wider text-ink-950">{code}</p>
        <Link href={`/${locale}/civic/track/${code}`} className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">{t("nav.trackReport")}</Link>
      </div>
    );

  return (
    <ActionForm action={submitReportAction} className="mt-8 space-y-5" encType="multipart/form-data" hidden={{ clientSubmissionId }} onResult={(s) => s.ok && s.data?.trackingCode && setCode(s.data.trackingCode)}>
      <Field label={t("civic.municipality")} name="municipality">
        {(p) => (
          <Select {...p} defaultValue={municipalities.length === 1 ? municipalities[0]!.slug : ""} required>
            {municipalities.length > 1 ? <option value="" disabled>—</option> : null}
            {municipalities.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
          </Select>
        )}
      </Field>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-800">{t("civic.category")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c, i) => (
            <label key={c} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border border-ink-200 bg-white px-3 py-2.5 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
              <input type="radio" name="category" value={c} defaultChecked={i === 0} className="accent-brand-700" />
              {t(`enums.CivicCategory.${c}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("civic.description")} name="description" hint={t("civic.descriptionHint")}>{(p) => <Textarea {...p} rows={4} required minLength={10} />}</Field>
      <div>
        <p className="mb-2 text-sm font-medium text-ink-800">{t("civic.location")}</p>
        <LocationPicker />
      </div>
      <Field label={t("civic.addressHint")} name="addressHint" optional>{(p) => <Input {...p} />}</Field>
      <Field label={t("civic.photos")} name="photos" hint={t("workOrders.uploadHint")} optional>
        {(p) => <input {...p} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="block w-full text-sm text-ink-700 file:me-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("civic.yourName")} name="reporterName" optional>{(p) => <Input {...p} autoComplete="name" />}</Field>
        <Field label={t("civic.contact")} name="reporterContact" optional>{(p) => <Input {...p} autoComplete="email" />}</Field>
      </div>
      <SubmitButton size="lg" className="w-full sm:w-auto">{t("civic.submit")}</SubmitButton>
    </ActionForm>
  );
}
