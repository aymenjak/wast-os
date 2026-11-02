"use client";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { loginAction } from "@/app/actions/public";

export function LoginForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={loginAction} className="space-y-4">
      <Field label={t("common.email")} name="email">{(p) => <Input {...p} type="email" autoComplete="email" required />}</Field>
      <Field label={t("auth.password")} name="password">{(p) => <Input {...p} type="password" autoComplete="current-password" required />}</Field>
      <SubmitButton className="w-full">{t("auth.signIn")}</SubmitButton>
    </ActionForm>
  );
}
