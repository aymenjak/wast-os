"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { createContractAction } from "@/app/actions/business";

type Opt = { id: string; name: string };
type CustomerOpt = { id: string; name: string; locations: { id: string; label: string }[] };

export function ContractForm({ customers, categories, defaultCustomerId, today }: { customers: CustomerOpt[]; categories: Opt[]; defaultCustomerId?: string; today: string }) {
  const { t } = useI18n();
  const [customerId, setCustomerId] = useState(defaultCustomerId && customers.some((c) => c.id === defaultCustomerId) ? defaultCustomerId : "");
  const [lines, setLines] = useState<number[]>([0]);
  const [next, setNext] = useState(1);
  const locations = customers.find((c) => c.id === customerId)?.locations ?? [];

  return (
    <ActionForm action={createContractAction} className="space-y-6" hidden={{ lineCount: String(lines.length) }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("contracts.customer")} name="customerId" className="sm:col-span-2">
          {(p) => (
            <Select {...p} value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="" disabled>—</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t("contracts.titleField")} name="title">{(p) => <Input {...p} required />}</Field>
        <Field label={t("contracts.reference")} name="reference" hint={t("contracts.referenceHint")} optional>{(p) => <Input {...p} dir="ltr" />}</Field>
        <Field label={t("contracts.startDate")} name="startDate">{(p) => <Input {...p} type="date" defaultValue={today} required />}</Field>
        <Field label={t("contracts.endDate")} name="endDate" optional>{(p) => <Input {...p} type="date" />}</Field>
        <Field label={t("contracts.renewalNoticeDays")} name="renewalNoticeDays">{(p) => <Input {...p} type="number" min={0} max={365} defaultValue={30} />}</Field>
        <Field label={t("contracts.slaHours")} name="slaResponseHours" optional>{(p) => <Input {...p} type="number" min={1} max={720} />}</Field>
        <div className="sm:col-span-2"><Checkbox name="autoRenew" label={t("contracts.autoRenew")} /></div>
        <Field label={t("contracts.serviceScope")} name="serviceScope" optional className="sm:col-span-2">{(p) => <Textarea {...p} rows={3} />}</Field>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-ink-900">{t("contracts.lines")}</legend>
        {!customerId ? <p className="text-sm text-ink-600">{t("contracts.selectCustomerFirst")}</p> : locations.length === 0 ? <p className="text-sm text-warning-700">{t("contracts.needsLocation")}</p> : null}
        {lines.map((key, i) => (
          <div key={key} className="grid gap-3 rounded-[var(--radius-control)] border border-ink-200 bg-ink-50/50 p-3 sm:grid-cols-6">
            <Field label={t("contracts.location")} name={`lines.${i}.serviceLocationId`} className="sm:col-span-2">
              {(p) => (
                <Select {...p} required disabled={!locations.length} defaultValue="">
                  <option value="" disabled>—</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t("contracts.category")} name={`lines.${i}.wasteCategoryId`} className="sm:col-span-2">
              {(p) => <Select {...p} required>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
            </Field>
            <Field label={t("contracts.frequency")} name={`lines.${i}.frequency`} className="sm:col-span-2">
              {(p) => <Select {...p} defaultValue="WEEKLY">{(["ON_DEMAND", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const).map((f) => <option key={f} value={f}>{t(`enums.Frequency.${f}`)}</option>)}</Select>}
            </Field>
            <Field label={t("contracts.billingUnit")} name={`lines.${i}.billingUnit`} className="sm:col-span-2">
              {(p) => <Select {...p}>{(["PER_COLLECTION", "PER_TONNE", "PER_MONTH"] as const).map((f) => <option key={f} value={f}>{t(`enums.BillingUnit.${f}`)}</option>)}</Select>}
            </Field>
            <Field label={t("contracts.unitPrice")} name={`lines.${i}.unitPrice`} className="sm:col-span-2">{(p) => <Input {...p} inputMode="decimal" dir="ltr" required />}</Field>
            <div className="flex items-end gap-2 sm:col-span-2">
              <Field label={t("contracts.estimatedQuantity")} name={`lines.${i}.estimatedQuantity`} optional className="flex-1">{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
              {lines.length > 1 ? (
                <button type="button" onClick={() => setLines((ls) => ls.filter((k) => k !== key))} className="mb-1 rounded-md p-2 text-ink-500 hover:bg-danger-100 hover:text-danger-700">
                  <Trash2 aria-hidden className="size-4" /><span className="sr-only">{t("contracts.removeLine")}</span>
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => { setLines((ls) => [...ls, next]); setNext((n) => n + 1); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
          <Plus aria-hidden className="size-4" />{t("contracts.addLine")}
        </button>
      </fieldset>
      <SubmitButton>{t("common.create")}</SubmitButton>
    </ActionForm>
  );
}
