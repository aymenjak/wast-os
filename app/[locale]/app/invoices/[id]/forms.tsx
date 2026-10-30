"use client";
import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { addInvoiceLineAction, issueInvoiceAction, recordPaymentAction, reversePaymentAction, voidInvoiceAction } from "@/app/actions/business";

export function PrintButton() {
  const { t } = useI18n();
  return <button type="button" onClick={() => window.print()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3 text-sm ring-1 ring-ink-200 hover:bg-ink-50"><Printer aria-hidden className="size-4" />{t("common.print")}</button>;
}

export function IssueForm({ invoiceId, today, due }: { invoiceId: string; today: string; due: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={issueInvoiceAction} hidden={{ invoiceId }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("invoices.issueDate")} name="issueDate">{(p) => <Input {...p} type="date" defaultValue={today} required />}</Field>
        <Field label={t("invoices.dueDate")} name="dueDate">{(p) => <Input {...p} type="date" defaultValue={due} required />}</Field>
      </div>
      <SubmitButton className="w-full">{t("invoices.issue")}</SubmitButton>
    </ActionForm>
  );
}

export function LineForm({ invoiceId, defaultTaxBps }: { invoiceId: string; defaultTaxBps: number }) {
  const { t } = useI18n();
  return (
    <ActionForm action={addInvoiceLineAction} hidden={{ invoiceId }} resetOnSuccess className="space-y-3">
      <Field label={t("invoices.description")} name="description">{(p) => <Input {...p} required />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("invoices.quantity")} name="quantity">{(p) => <Input {...p} inputMode="decimal" dir="ltr" defaultValue="1" required />}</Field>
        <Field label={t("invoices.unitPrice")} name="unitPrice">{(p) => <Input {...p} inputMode="decimal" dir="ltr" required />}</Field>
      </div>
      <Field label={t("invoices.taxRateBps")} name="taxRateBps">{(p) => <Input {...p} type="number" min={0} max={10000} dir="ltr" defaultValue={defaultTaxBps} required />}</Field>
      <SubmitButton size="sm" variant="secondary">{t("common.add")}</SubmitButton>
    </ActionForm>
  );
}

/**
 * The idempotency key is generated once per form render. A double-click or a retried request
 * reuses it, so the server records the payment once. It is rotated after a successful save.
 */
export function PaymentForm({ invoiceId, balance, today }: { invoiceId: string; balance: string; today: string }) {
  const { t } = useI18n();
  const [round, setRound] = useState(0);
  const key = useMemo(() => `pay-${crypto.randomUUID()}`, [round]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ActionForm key={key} action={recordPaymentAction} hidden={{ invoiceId, idempotencyKey: key }} onResult={(s) => s.ok && setRound((r) => r + 1)} className="space-y-3">
      <p className="text-xs text-ink-600">{t("invoices.paymentNote")}</p>
      <Field label={t("invoices.amount")} name="amount">{(p) => <Input {...p} inputMode="decimal" dir="ltr" defaultValue={balance} required />}</Field>
      <Field label={t("invoices.method")} name="method">
        {(p) => <Select {...p} defaultValue="BANK_TRANSFER">{(["BANK_TRANSFER", "CASH", "CHEQUE", "OTHER"] as const).map((m) => <option key={m} value={m}>{t(`enums.PaymentMethod.${m}`)}</option>)}</Select>}
      </Field>
      <Field label={t("invoices.reference")} name="reference" optional>{(p) => <Input {...p} dir="ltr" />}</Field>
      <Field label={t("invoices.receivedAt")} name="receivedAt">{(p) => <Input {...p} type="date" defaultValue={today} max={today} required />}</Field>
      <SubmitButton className="w-full">{t("invoices.recordPayment")}</SubmitButton>
    </ActionForm>
  );
}

export function ReverseForm({ paymentId, invoiceId }: { paymentId: string; invoiceId: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-1 text-xs text-ink-500 hover:text-danger-700 hover:underline">{t("invoices.reverse")}</button>;
  return (
    <ActionForm action={reversePaymentAction} hidden={{ paymentId, invoiceId }} className="mt-2 flex items-end gap-2">
      <Field label={t("common.reason")} name="reason" className="flex-1">{(p) => <Input {...p} required />}</Field>
      <SubmitButton size="sm" variant="danger">{t("invoices.reverse")}</SubmitButton>
    </ActionForm>
  );
}

export function VoidForm({ invoiceId }: { invoiceId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={voidInvoiceAction} hidden={{ invoiceId }} className="space-y-3">
      <Field label={t("common.reason")} name="reason">{(p) => <Input {...p} required minLength={3} />}</Field>
      <SubmitButton size="sm" variant="danger">{t("invoices.void")}</SubmitButton>
    </ActionForm>
  );
}
