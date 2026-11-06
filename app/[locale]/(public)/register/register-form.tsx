"use client";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { registerAction } from "@/app/actions/public";

export function RegisterForm() {
  const { t, locale } = useI18n();
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
      <Field
        label={t("auth.privacyConsent")}
        name="acceptPrivacy"
        hint={<a href={`/${locale}/privacy`} target="_blank" rel="noopener" className="text-brand-800 underline">{t("auth.privacyRead")}</a>}
        className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 [&>input]:order-1 [&>label]:order-2 [&>p]:order-3 [&>p]:col-span-2"
      >
        {(p) => <input {...p} type="checkbox" required className="size-5 accent-brand-700" />}
      </Field>
      <SubmitButton className="w-full">{t("auth.createWorkspace")}</SubmitButton>
    </ActionForm>
  );
}
