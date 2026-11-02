"use client";
import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { createRequestAction } from "@/app/actions/business";

type CustomerOpt = { id: string; name: string; locations: { id: string; label: string }[]; contracts: { id: string; reference: string; title: string }[] };

/** Shared by staff (customer selectable) and the customer portal (customer fixed server-side). */
export function RequestForm({ customers, categories, defaultCustomerId, today, portal = false }: { customers: CustomerOpt[]; categories: { id: string; name: string }[]; defaultCustomerId?: string; today: string; portal?: boolean }) {
  const { t } = useI18n();
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? (customers.length === 1 ? customers[0]!.id : ""));
  const c = customers.find((x) => x.id === customerId);
  return (
    <ActionForm action={createRequestAction} className="grid gap-4 sm:grid-cols-2">
      {portal ? <input type="hidden" name="customerId" value={customerId} /> : (
        <Field label={t("requests.customer")} name="customerId" className="sm:col-span-2">
          {(p) => (
            <Select {...p} value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="" disabled>—</option>
              {customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          )}
        </Field>
      )}
      <Field label={t("requests.location")} name="serviceLocationId">
        {(p) => (
          <Select {...p} key={customerId} required defaultValue={c?.locations.length === 1 ? c.locations[0]!.id : ""}>
            <option value="" disabled>—</option>
            {c?.locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t("requests.contract")} name="contractId" optional>
        {(p) => (
          <Select {...p} key={customerId} defaultValue={c?.contracts.length === 1 ? c.contracts[0]!.id : ""}>
            <option value="">{t("requests.noContract")}</option>
            {c?.contracts.map((k) => <option key={k.id} value={k.id}>{k.reference} — {k.title}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t("requests.category")} name="wasteCategoryId">
        {(p) => <Select {...p} required>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("requests.quantity")} name="estimatedQuantity" optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
        <Field label={t("requests.unit")} name="quantityUnit">
          {(p) => <Select {...p} defaultValue="CONTAINER">{(["CONTAINER", "BAG", "KG", "TONNE", "CUBIC_METRE"] as const).map((u) => <option key={u} value={u}>{t(`enums.QuantityUnit.${u}`)}</option>)}</Select>}
        </Field>
      </div>
      <Field label={t("requests.preferredDate")} name="preferredDate">{(p) => <Input {...p} type="date" min={today} defaultValue={today} required />}</Field>
      <Field label={t("requests.window")} name="preferredWindow">
        {(p) => <Select {...p}>{(["ANY", "MORNING", "AFTERNOON", "EVENING"] as const).map((w) => <option key={w} value={w}>{t(`enums.TimeWindow.${w}`)}</option>)}</Select>}
      </Field>
      <Field label={t("requests.priority")} name="priority">
        {(p) => <Select {...p} defaultValue="NORMAL">{(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((w) => <option key={w} value={w}>{t(`enums.Priority.${w}`)}</option>)}</Select>}
      </Field>
      <Field label={t("common.notes")} name="notes" optional className="sm:col-span-2">{(p) => <Textarea {...p} rows={3} />}</Field>
      <div className="sm:col-span-2"><SubmitButton>{t("common.submit")}</SubmitButton></div>
    </ActionForm>
  );
}
