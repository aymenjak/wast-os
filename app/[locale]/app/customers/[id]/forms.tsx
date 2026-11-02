"use client";
import { ActionForm, Checkbox, Field, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { LocationPicker } from "@/components/map/location-picker";
import { addContactAction, addLocationAction, addNoteAction } from "@/app/actions/business";

export function ContactForm({ customerId }: { customerId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={addContactAction} hidden={{ customerId }} className="space-y-3" resetOnSuccess>
      <Field label={t("common.name")} name="name">{(p) => <Input {...p} required />}</Field>
      <Field label={t("customers.jobTitle")} name="jobTitle" optional>{(p) => <Input {...p} />}</Field>
      <Field label={t("common.email")} name="email" optional>{(p) => <Input {...p} type="email" dir="ltr" />}</Field>
      <Field label={t("common.phone")} name="phone" optional>{(p) => <Input {...p} type="tel" dir="ltr" />}</Field>
      <Checkbox name="isPrimary" label={t("customers.primary")} />
      <div><SubmitButton size="sm">{t("common.add")}</SubmitButton></div>
    </ActionForm>
  );
}

export function LocationForm({ customerId }: { customerId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={addLocationAction} hidden={{ customerId }} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("customers.label")} name="label">{(p) => <Input {...p} required />}</Field>
      <Field label={t("common.address")} name="addressLine">{(p) => <Input {...p} required />}</Field>
      <Field label={t("common.commune")} name="commune" optional>{(p) => <Input {...p} />}</Field>
      <Field label={t("common.wilaya")} name="wilaya" optional>{(p) => <Input {...p} />}</Field>
      <div className="sm:col-span-2"><LocationPicker /></div>
      <Field label={t("customers.accessNotes")} name="accessNotes" optional className="sm:col-span-2">{(p) => <Textarea {...p} rows={2} />}</Field>
      <div className="sm:col-span-2"><SubmitButton size="sm">{t("customers.addLocation")}</SubmitButton></div>
    </ActionForm>
  );
}

export function NoteForm({ customerId }: { customerId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={addNoteAction} hidden={{ customerId }} className="space-y-2" resetOnSuccess>
      <Field label={t("customers.addNote")} name="body">{(p) => <Textarea {...p} rows={2} required />}</Field>
      <SubmitButton size="sm" variant="secondary">{t("common.add")}</SubmitButton>
    </ActionForm>
  );
}
