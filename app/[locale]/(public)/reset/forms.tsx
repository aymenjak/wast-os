"use client";
import { useState } from "react";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { forgotPasswordAction, resetPasswordAction } from "@/app/actions/public";

export function ForgotForm() {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  if (sent) return <p role="status" className="rounded-md bg-success-100 px-3 py-2 text-sm text-success-700">{t("auth.forgotSent")}</p>;
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-4" onResult={(s) => s.ok && setSent(true)}>
      <Field label={t("common.email")} name="email">{(p) => <Input {...p} type="email" autoComplete="email" required />}</Field>
      <SubmitButton className="w-full">{t("auth.forgotSend")}</SubmitButton>
    </ActionForm>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={resetPasswordAction} hidden={{ token }} className="space-y-4">
      <Field label={t("auth.newPassword")} name="password" hint={t("auth.passwordHint")}>{(p) => <Input {...p} type="password" autoComplete="new-password" required minLength={10} />}</Field>
      <SubmitButton className="w-full">{t("auth.resetSave")}</SubmitButton>
    </ActionForm>
  );
}
