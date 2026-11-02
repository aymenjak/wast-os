"use client";
import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { contactAction } from "@/app/actions/public";

export function ContactForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={contactAction} className="mt-5 space-y-4" successMessage={t("about.sent")} resetOnSuccess>
      <Field label={t("common.name")} name="name">{(p) => <Input {...p} autoComplete="name" required />}</Field>
      <Field label={t("about.company")} name="company">{(p) => <Input {...p} autoComplete="organization" required />}</Field>
      <Field label={t("common.email")} name="email">{(p) => <Input {...p} type="email" autoComplete="email" required />}</Field>
      <Field label={t("about.message")} name="message">{(p) => <Textarea {...p} rows={5} required />}</Field>
      <SubmitButton>{t("about.send")}</SubmitButton>
    </ActionForm>
  );
}
