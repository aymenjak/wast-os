"use client";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { createCustomerAction, updateCustomerAction } from "@/app/actions/business";

type Customer = { id: string; name: string; kind: string; taxId: string | null; email: string | null; phone: string | null; billingAddress: string | null; serviceConditions: string | null; status: string };

export function CustomerForm({ customer }: { customer?: Customer }) {
  const { t } = useI18n();
  return (
    <ActionForm action={customer ? updateCustomerAction : createCustomerAction} className="grid gap-4 sm:grid-cols-2" hidden={customer ? { customerId: customer.id } : undefined} successMessage={customer ? t("common.saved") : undefined}>
      <Field label={t("common.name")} name="name" className="sm:col-span-2">{(p) => <Input {...p} defaultValue={customer?.name} required />}</Field>
      <Field label={t("customers.kind")} name="kind">
        {(p) => (
          <Select {...p} defaultValue={customer?.kind ?? "BUSINESS"}>
            {(["BUSINESS", "INSTITUTION", "RESIDENTIAL"] as const).map((k) => <option key={k} value={k}>{t(`enums.CustomerKind.${k}`)}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t("customers.taxId")} name="taxId" optional>{(p) => <Input {...p} dir="ltr" defaultValue={customer?.taxId ?? ""} />}</Field>
      <Field label={t("common.email")} name="email" optional>{(p) => <Input {...p} type="email" dir="ltr" defaultValue={customer?.email ?? ""} />}</Field>
      <Field label={t("common.phone")} name="phone" optional>{(p) => <Input {...p} type="tel" dir="ltr" defaultValue={customer?.phone ?? ""} />}</Field>
      <Field label={t("customers.billingAddress")} name="billingAddress" optional className="sm:col-span-2">{(p) => <Input {...p} defaultValue={customer?.billingAddress ?? ""} />}</Field>
      <Field label={t("customers.serviceConditions")} name="serviceConditions" hint={t("customers.serviceConditionsHint")} optional className="sm:col-span-2">{(p) => <Textarea {...p} defaultValue={customer?.serviceConditions ?? ""} />}</Field>
      {customer ? (
        <Field label={t("common.status")} name="status">
          {(p) => (
            <Select {...p} defaultValue={customer.status}>
              <option value="ACTIVE">{t("enums.CustomerStatus.ACTIVE")}</option>
              <option value="INACTIVE">{t("enums.CustomerStatus.INACTIVE")}</option>
            </Select>
          )}
        </Field>
      ) : null}
      <div className="sm:col-span-2"><SubmitButton>{customer ? t("common.save") : t("common.create")}</SubmitButton></div>
    </ActionForm>
  );
}
