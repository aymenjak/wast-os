"use client";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { addSurchargeAction, setLinePricingAction } from "@/app/actions/business";

const TIER_ROWS = 3;

/** Minimum charge and graduated tiers of one per-tonne line (D-90). Empty tier rows are ignored. */
export function LinePricingForm({ contractId, lineId, minimumCharge, tiers }: { contractId: string; lineId: string; minimumCharge: string | null; tiers: { aboveTonnes: string; unitPrice: string }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setLinePricingAction} hidden={{ contractId, lineId }} className="space-y-3">
      <Field label={t("contracts.minimumCharge")} name="minimumCharge" optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" defaultValue={minimumCharge ?? ""} className="max-w-48" />}</Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink-800">{t("contracts.tiers")}</legend>
        <p className="mb-2 text-xs text-ink-600">{t("contracts.tiersHint")}</p>
        <div className="space-y-2">
          {Array.from({ length: TIER_ROWS }, (_, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:max-w-md">
              <Field label={t("contracts.tierAbove")} name={`tiers.${i}.aboveTonnes`} optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" defaultValue={tiers[i]?.aboveTonnes ?? ""} />}</Field>
              <Field label={t("contracts.tierPrice")} name={`tiers.${i}.unitPrice`} optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" defaultValue={tiers[i]?.unitPrice ?? ""} />}</Field>
            </div>
          ))}
        </div>
      </fieldset>
      <SubmitButton variant="secondary">{t("contracts.savePricing")}</SubmitButton>
    </ActionForm>
  );
}

export function SurchargeForm({ contractId }: { contractId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={addSurchargeAction} hidden={{ contractId }} resetOnSuccess className="grid gap-3 rounded-md bg-ink-50 p-3 sm:grid-cols-3 sm:items-end">
      <Field label={t("contracts.surchargeLabel")} name="label">{(p) => <Input {...p} required maxLength={80} />}</Field>
      <Field label={t("contracts.surchargeKind")} name="kind">
        {(p) => <Select {...p} defaultValue="PERCENT"><option value="PERCENT">{t("enums.SurchargeKind.PERCENT")}</option><option value="PER_COLLECTION">{t("enums.SurchargeKind.PER_COLLECTION")}</option></Select>}
      </Field>
      <Field label={t("contracts.surchargeValue")} name="value" hint={t("contracts.surchargeValueHint")}>{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <div className="sm:col-span-3"><SubmitButton variant="secondary">{t("contracts.addSurcharge")}</SubmitButton></div>
    </ActionForm>
  );
}
