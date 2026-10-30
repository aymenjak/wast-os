"use client";
import { ActionForm, SubmitButton, Field, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { createDraftInvoiceAction } from "@/app/actions/business";

export function DraftForm({ customerId, orders }: { customerId: string; orders: { id: string; label: string; weight: string | null }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createDraftInvoiceAction} hidden={{ customerId }} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-900">{t("invoices.selectWork")}</legend>
        {orders.length === 0 ? <p className="text-sm text-ink-600">{t("invoices.noBillable")}</p> : (
          <ul className="divide-y divide-ink-100 rounded-[var(--radius-control)] border border-ink-200">
            {orders.map((o) => (
              <li key={o.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-ink-50">
                  <input type="checkbox" name="workOrderIds[]" value={o.id} defaultChecked className="size-4 accent-brand-700" />
                  <span className="flex-1">{o.label}</span>
                  {o.weight ? <span className="num text-xs text-ink-500">{o.weight}</span> : null}
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
      <Field label={t("common.notes")} name="notes" optional>{(p) => <Textarea {...p} rows={2} />}</Field>
      <SubmitButton>{t("invoices.createDraft")}</SubmitButton>
    </ActionForm>
  );
}
