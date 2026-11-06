"use client";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { runMonthlyBillingAction } from "@/app/actions/business";

export type MonthlyRow = { customerId: string; name: string; collections: number; flatFees: number; total: string; problems: { number: string; message: string }[] };

/** Customers to bill this month, all ticked; untick one to leave it for later. */
export function MonthlyRunForm({ month, rows, total }: { month: string; rows: MonthlyRow[]; total: string }) {
  const { t } = useI18n();
  const billable = rows.filter((r) => r.collections + r.flatFees > 0);
  return (
    <ActionForm action={runMonthlyBillingAction} hidden={{ month }} className="space-y-4">
      <ul className="divide-y divide-ink-100 rounded-[var(--radius-control)] border border-ink-200">
        {rows.map((r) => {
          const has = r.collections + r.flatFees > 0;
          const name = <span className={has ? "font-medium text-ink-900" : "text-ink-700"}>{r.name}</span>;
          return (
            <li key={r.customerId} className="space-y-1 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                {has ? (
                  <label className="flex min-w-0 cursor-pointer items-start gap-2">
                    <input type="checkbox" name="customerIds[]" value={r.customerId} defaultChecked className="mt-0.5 size-4 shrink-0 accent-brand-700" />
                    {name}
                  </label>
                ) : name}
                <span className="num shrink-0 font-semibold text-ink-900">{r.total}</span>
              </div>
              <p className="text-sm text-ink-600">
                {t("invoices.monthlyCollections")}: <span className="num">{r.collections}</span> · {t("invoices.monthlyFees")}: <span className="num">{r.flatFees}</span>
              </p>
              {r.problems.length ? (
                <div className="text-xs text-warning-700">
                  <span className="font-medium">{t("invoices.monthlyLeftOut")}:</span>
                  <ul className="mt-0.5 space-y-0.5">{r.problems.map((p) => <li key={p.number}>{p.message}</li>)}</ul>
                </div>
              ) : null}
            </li>
          );
        })}
        <li className="flex items-center justify-between gap-3 bg-ink-50 px-3 py-3 font-semibold text-ink-900">
          <span>{t("invoices.monthlyTotal")}</span><span className="num">{total}</span>
        </li>
      </ul>
      {billable.length ? <SubmitButton size="lg">{t("invoices.monthlyCreate").replace("{n}", String(billable.length))}</SubmitButton> : null}
    </ActionForm>
  );
}
