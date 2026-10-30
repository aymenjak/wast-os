"use client";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { registerAction } from "@/app/actions/public";

export function RegisterForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={registerAction} className="space-y-4">
      <Field label={t("auth.organizationName")} name="organizationName">{(p) => <Input {...p} autoComplete="organization" required />}</Field>
      <Field label={t("auth.organizationKind")} name="kind">
        {(p) => (
          <Select {...p} defaultValue="SERVICE_PROVIDER">
            <option value="SERVICE_PROVIDER">{t("auth.kindProvider")}</option>
            <option value="MUNICIPALITY">{t("auth.kindMunicipality")}</option>
          </Select>
        )}
      </Field>
      <Field label={t("common.wilaya")} name="wilaya" optional>{(p) => <Input {...p} />}</Field>
      <Field label={t("auth.yourName")} name="name">{(p) => <Input {...p} autoComplete="name" required />}</Field>
      <Field label={t("common.email")} name="email">{(p) => <Input {...p} type="email" autoComplete="email" required />}</Field>
      <Field label={t("auth.password")} name="password" hint={t("auth.passwordHint")}>{(p) => <Input {...p} type="password" autoComplete="new-password" minLength={10} required />}</Field>
      <SubmitButton className="w-full">{t("auth.createWorkspace")}</SubmitButton>
    </ActionForm>
  );
}
