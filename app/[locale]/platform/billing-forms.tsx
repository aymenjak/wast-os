"use client";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { recordPlatformPaymentAction, runBillingAction, updateBillingSettingsAction, voidPlatformInvoiceAction } from "@/app/actions/platform";

type S = { enabled: boolean; autoSuspend: boolean; issuerName: string; issuerAddress: string; issuerTaxId: string; issuerTradeRegister: string; issuerStatId: string; taxRateBps: number; dueDays: number; graceDays: number };

export function BillingSettingsForm({ s }: { s: S }) {
  const { t } = useI18n();
  return (
    <ActionForm action={updateBillingSettingsAction} className="grid gap-3 sm:grid-cols-2" successMessage={t("common.saved")}>
      <Field label={t("billing.issuerName")} name="issuerName">{(p) => <Input {...p} required defaultValue={s.issuerName} />}</Field>
      <Field label="NIF" name="issuerTaxId">{(p) => <Input {...p} required defaultValue={s.issuerTaxId} />}</Field>
      <Field label={t("billing.issuerAddress")} name="issuerAddress" optional className="sm:col-span-2">{(p) => <Input {...p} defaultValue={s.issuerAddress} />}</Field>
      <Field label="RC" name="issuerTradeRegister" optional>{(p) => <Input {...p} defaultValue={s.issuerTradeRegister} />}</Field>
      <Field label="NIS" name="issuerStatId" optional>{(p) => <Input {...p} defaultValue={s.issuerStatId} />}</Field>
      <Field label={t("billing.taxRate")} name="taxRateBps" hint={t("billing.taxRateHint")}>{(p) => <Input {...p} type="number" min={0} max={10000} required defaultValue={s.taxRateBps} />}</Field>
      <Field label={t("billing.dueDays")} name="dueDays">{(p) => <Input {...p} type="number" min={0} max={120} required defaultValue={s.dueDays} />}</Field>
      <Field label={t("billing.graceDays")} name="graceDays" hint={t("billing.graceHint")}>{(p) => <Input {...p} type="number" min={0} max={365} required defaultValue={s.graceDays} />}</Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Checkbox name="enabled" defaultChecked={s.enabled} label={t("billing.enabled")} />
        <Checkbox name="autoSuspend" defaultChecked={s.autoSuspend} label={t("billing.autoSuspend")} />
      </div>
      <div className="sm:col-span-2"><SubmitButton>{t("platform.tenant.save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function RunBillingButton() {
  const { t } = useI18n();
  return (
    <ActionForm action={runBillingAction} successMessage={t("billing.runDone")}>
      <SubmitButton>{t("billing.runNow")}</SubmitButton>
    </ActionForm>
  );
}

export function RecordPaymentForm({ invoiceId, today }: { invoiceId: string; today: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={recordPlatformPaymentAction} hidden={{ invoiceId, paidAt: today }} className="flex flex-wrap items-end gap-2">
      <Field label={t("billing.method")} name="method">
        {(p) => <Select {...p} defaultValue="BANK_TRANSFER">{(["BANK_TRANSFER", "CHEQUE", "CASH", "CARD_ONLINE"] as const).map((m) => <option key={m} value={m}>{t(`billing.methods.${m}`)}</option>)}</Select>}
      </Field>
      <Field label={t("billing.reference")} name="reference" optional>{(p) => <Input {...p} className="w-32" />}</Field>
      <SubmitButton size="sm" variant="secondary">{t("billing.markPaid")}</SubmitButton>
    </ActionForm>
  );
}

export function VoidForm({ invoiceId }: { invoiceId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={voidPlatformInvoiceAction} hidden={{ invoiceId }} className="flex flex-wrap items-end gap-2">
      <Field label={t("billing.voidReason")} name="reason">{(p) => <Input {...p} required className="w-40" />}</Field>
      <SubmitButton size="sm" variant="danger">{t("billing.void")}</SubmitButton>
    </ActionForm>
  );
}
