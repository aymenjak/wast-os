"use client";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { updateSettingsAction } from "@/app/actions/business";

type Org = { name: string; legalName: string | null; taxId: string | null; statisticalId: string | null; tradeRegister: string | null; address: string | null; wilaya: string | null; commune: string | null; phone: string | null; email: string; defaultTaxRateBps: number; invoicePrefix: string; timezone: string; civicSlaHours: number; kind: string };

export function SettingsForm({ org }: { org: Org }) {
  const { t } = useI18n();
  const v = (x: string | null) => x ?? "";
  return (
    <ActionForm action={updateSettingsAction} successMessage={t("common.saved")} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("common.name")} name="name">{(p) => <Input {...p} defaultValue={org.name} required />}</Field>
        <Field label={t("common.email")} name="email" optional>{(p) => <Input {...p} type="email" dir="ltr" defaultValue={org.email} />}</Field>
        <Field label={t("common.phone")} name="phone" optional>{(p) => <Input {...p} dir="ltr" defaultValue={v(org.phone)} />}</Field>
        <Field label={t("common.address")} name="address" optional>{(p) => <Input {...p} defaultValue={v(org.address)} />}</Field>
        <Field label={t("common.wilaya")} name="wilaya" optional>{(p) => <Input {...p} defaultValue={v(org.wilaya)} />}</Field>
        <Field label={t("common.commune")} name="commune" optional>{(p) => <Input {...p} defaultValue={v(org.commune)} />}</Field>
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-ink-900">{t("settings.legal")}</legend>
        <Field label={t("settings.legalName")} name="legalName" optional className="sm:col-span-2">{(p) => <Input {...p} defaultValue={v(org.legalName)} />}</Field>
        <Field label={t("settings.taxId")} name="taxId" optional>{(p) => <Input {...p} dir="ltr" defaultValue={v(org.taxId)} />}</Field>
        <Field label={t("settings.statisticalId")} name="statisticalId" optional>{(p) => <Input {...p} dir="ltr" defaultValue={v(org.statisticalId)} />}</Field>
        <Field label={t("settings.tradeRegister")} name="tradeRegister" optional>{(p) => <Input {...p} dir="ltr" defaultValue={v(org.tradeRegister)} />}</Field>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-ink-900">{t("settings.billing")}</legend>
        <Field label={t("settings.defaultTax")} name="defaultTaxRateBps">{(p) => <Input {...p} type="number" min={0} max={10000} dir="ltr" defaultValue={org.defaultTaxRateBps} />}</Field>
        <Field label={t("settings.invoicePrefix")} name="invoicePrefix">{(p) => <Input {...p} dir="ltr" defaultValue={org.invoicePrefix} pattern="[A-Z0-9]{2,8}" />}</Field>
        <Field label={t("settings.timezone")} name="timezone">{(p) => <Input {...p} dir="ltr" defaultValue={org.timezone} />}</Field>
        {org.kind === "MUNICIPALITY" ? <Field label={t("settings.civicSla")} name="civicSlaHours">{(p) => <Input {...p} type="number" min={1} dir="ltr" defaultValue={org.civicSlaHours} />}</Field> : null}
      </fieldset>
      <SubmitButton>{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}
