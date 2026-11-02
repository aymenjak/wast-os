"use client";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { secondFactorAction } from "@/app/actions/public";

export function SecondFactorForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={secondFactorAction} className="space-y-4">
      <Field label={t("mfa.code")} name="code" hint={t("mfa.codeHint")}>
        {(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={11} className="num text-center text-lg tracking-widest" />}
      </Field>
      <SubmitButton className="w-full">{t("mfa.verify")}</SubmitButton>
    </ActionForm>
  );
}
