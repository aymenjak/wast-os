"use client";
import { ActionForm, SubmitButton, Field, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { createDraftInvoiceAction } from "@/app/actions/business";

export function DraftForm({ customerId, orders }: { customerId: string; orders: { id: string; label: string; weight: string | null; needsPrice: boolean }[] }) {
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
                {o.needsPrice ? (
                  // One-off job: no contract price, so finance types it here and the line stays linked to the job.
                  <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5 ps-10">
                    <label htmlFor={`price_${o.id}`} className="text-xs text-ink-700">{t("invoices.jobPrice")}</label>
                    <input id={`price_${o.id}`} name={`price_${o.id}`} inputMode="decimal" autoComplete="off" className="num h-9 w-36 rounded-[var(--radius-control)] border border-ink-300 bg-white px-2 text-sm" />
                  </div>
                ) : null}
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
