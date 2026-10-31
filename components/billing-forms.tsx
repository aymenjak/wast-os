"use client";
import { CreditCard } from "lucide-react";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { clearChargilyAction, payPlatformInvoiceAction, saveChargilyAction } from "@/app/actions/billing";

export function PayPlatformInvoice({ invoiceId, size = "md" }: { invoiceId: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  return (
    <ActionForm action={payPlatformInvoiceAction} hidden={{ invoiceId }}>
      <SubmitButton size={size}><CreditCard aria-hidden className="size-4" />{t("payOnline.button")}</SubmitButton>
    </ActionForm>
  );
}

export function ChargilyForm({ configured, mode }: { configured: boolean; mode: "test" | "live" }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <ActionForm action={saveChargilyAction} className="space-y-3" resetOnSuccess successMessage={t("common.saved")}>
        <Field label={t("billing.chargilyKey")} name="secretKey" hint={configured ? t("billing.chargilyReplace") : t("billing.chargilyKeyHint")}>
          {(p) => <Input {...p} type="password" autoComplete="off" required minLength={20} />}
        </Field>
        <Field label={t("billing.chargilyMode")} name="mode">
          {(p) => <Select {...p} defaultValue={mode}><option value="test">{t("billing.modeTest")}</option><option value="live">{t("billing.modeLive")}</option></Select>}
        </Field>
        <SubmitButton variant="secondary">{t("billing.chargilySave")}</SubmitButton>
      </ActionForm>
      {configured ? (
        <ActionForm action={clearChargilyAction}>
          <SubmitButton variant="danger" size="sm">{t("billing.chargilyRemove")}</SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}
