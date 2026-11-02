"use client";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import {
  addAdjustmentAction, createBaleAction, createPurchaseAction, createSaleAction, createSupplierAction, deliverSaleAction, recordClaimAction, voidPurchaseAction,
} from "@/app/actions/business";

const STREAMS = ["PAPER_CARDBOARD", "PET", "HDPE_PP", "PLASTIC_FILM", "MIXED_PLASTIC", "FERROUS", "ALUMINIUM", "GLASS", "ORGANIC", "WOOD", "TEXTILE", "INERT", "SPECIAL", "RESIDUAL"] as const;

function StreamSelect({ name, required = true, empty = false }: { name: string; required?: boolean; empty?: boolean }) {
  const { t } = useI18n();
  return (
    <Field label={t("recycling.stream")} name={name}>
      {(p) => <Select {...p} required={required} defaultValue={empty ? "" : "PAPER_CARDBOARD"}>{empty ? <option value="">—</option> : null}{STREAMS.map((s) => <option key={s} value={s}>{t(`enums.MaterialStream.${s}`)}</option>)}</Select>}
    </Field>
  );
}

export function BaleForm({ yardId }: { yardId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createBaleAction} hidden={{ yardId }} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("yard.baleCreated")}>
      <div className="sm:col-span-2"><StreamSelect name="stream" /></div>
      <Field label={t("yard.grade")} name="grade" optional>{(p) => <Input {...p} maxLength={40} />}</Field>
      <Field label={t("yard.weightKg")} name="weightKg">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <div className="sm:col-span-2"><SubmitButton>{t("yard.makeBale")}</SubmitButton></div>
    </ActionForm>
  );
}

export function AdjustmentForm({ yardId }: { yardId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={addAdjustmentAction} hidden={{ yardId }} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("common.saved")}>
      <StreamSelect name="stream" />
      <Field label={t("yard.adjustmentKind")} name="kind">{(p) => <Select {...p} defaultValue="REJECT">{(["REJECT", "OPENING", "CORRECTION"] as const).map((k) => <option key={k} value={k}>{t(`enums.YardAdjustmentKind.${k}`)}</option>)}</Select>}</Field>
      <Field label={t("yard.weightKg")} name="kg" hint={t("yard.correctionHint")}>{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <Field label={t("yard.reason")} name="reason">{(p) => <Input {...p} required maxLength={300} />}</Field>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("common.save")}</SubmitButton></div>
    </ActionForm>
  );
}

export function SupplierForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createSupplierAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("common.saved")}>
      <Field label={t("common.name")} name="name">{(p) => <Input {...p} required maxLength={120} />}</Field>
      <Field label={t("yard.supplierKind")} name="kind">{(p) => <Select {...p} defaultValue="INDIVIDUAL">{(["INDIVIDUAL", "COMPANY"] as const).map((k) => <option key={k} value={k}>{t(`enums.SupplierKind.${k}`)}</option>)}</Select>}</Field>
      <Field label={t("common.phone")} name="phone" optional>{(p) => <Input {...p} maxLength={30} dir="ltr" inputMode="tel" />}</Field>
      <Field label={t("yard.supplierRegistration")} name="registrationNumber" optional hint={t("yard.supplierRegistrationHint")}>{(p) => <Input {...p} maxLength={80} />}</Field>
      <p className="text-xs text-ink-600 sm:col-span-2">{t("yard.privacyNote")}</p>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("yard.addSupplier")}</SubmitButton></div>
    </ActionForm>
  );
}

export function PurchaseForm({ yardId, suppliers }: { yardId: string; suppliers: { id: string; name: string }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createPurchaseAction} hidden={{ yardId }} className="space-y-4">
      <Field label={t("yard.supplier")} name="supplierId" hint={suppliers.length ? undefined : t("yard.noSuppliers")}>
        {(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>}
      </Field>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <fieldset key={i} className="grid gap-2 rounded-md border border-ink-200 p-3 sm:grid-cols-5">
            <legend className="px-1 text-xs text-ink-600">{t("yard.line")} {i + 1}{i > 0 ? ` (${t("common.optional")})` : ""}</legend>
            <StreamSelect name={`lines.${i}.stream`} />
            <Field label={t("yard.grade")} name={`lines.${i}.grade`} optional>{(p) => <Input {...p} maxLength={40} />}</Field>
            <Field label={t("workOrders.grossKg")} name={`lines.${i}.grossKg`}>{(p) => <Input {...p} required={i === 0} inputMode="decimal" dir="ltr" />}</Field>
            <Field label={t("workOrders.tareKg")} name={`lines.${i}.tareKg`} optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
            <Field label={t("yard.pricePerKg")} name={`lines.${i}.unitPrice`}>{(p) => <Input {...p} required={i === 0} inputMode="decimal" dir="ltr" />}</Field>
          </fieldset>
        ))}
      </div>
      <p className="text-xs text-ink-600">{t("yard.priceNote")}</p>
      <Checkbox name="paid" label={t("yard.paidNow")} />
      <div><SubmitButton>{t("yard.recordPurchase")}</SubmitButton></div>
    </ActionForm>
  );
}

export function VoidPurchaseForm({ purchaseId }: { purchaseId: string }) {
  const { t } = useI18n();
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-danger-700 hover:underline">{t("yard.voidPurchase")}</summary>
      <ActionForm action={voidPurchaseAction} hidden={{ purchaseId }} className="mt-3 flex flex-wrap items-end gap-2">
        <Field label={t("yard.reason")} name="voidReason" className="min-w-64 flex-1">{(p) => <Input {...p} required maxLength={300} />}</Field>
        <SubmitButton variant="danger">{t("yard.voidPurchase")}</SubmitButton>
      </ActionForm>
    </details>
  );
}

export function SaleForm({ yardId, buyers, bales, streams }: { yardId: string; buyers: { id: string; name: string; registrationNumber: string | null }[]; bales: { id: string; number: string; stream: string; weightKg: number; grade: string | null }[]; streams: string[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createSaleAction} hidden={{ yardId }} className="space-y-4">
      <Field label={t("yard.buyer")} name="buyerId" hint={buyers.length ? undefined : t("yard.noBuyers")}>
        {(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{buyers.map((b) => <option key={b.id} value={b.id}>{b.name}{b.registrationNumber ? ` · ${b.registrationNumber}` : ""}</option>)}</Select>}
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-ink-900">{t("yard.balesToSell")}</legend>
        {bales.length === 0 ? <p className="mt-1 text-sm text-ink-600">{t("yard.noBales")}</p> : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{bales.map((b) => <Checkbox key={b.id} name="baleIds[]" value={b.id} label={<span><span className="num">{b.number}</span> · {t(`enums.MaterialStream.${b.stream}`)}{b.grade ? ` (${b.grade})` : ""} · <span className="num">{b.weightKg}</span> kg</span>} />)}</div>
        )}
      </fieldset>
      {[0, 1].map((i) => (
        <fieldset key={i} className="grid gap-2 rounded-md border border-ink-200 p-3 sm:grid-cols-3">
          <legend className="px-1 text-xs text-ink-600">{t("yard.looseLine")} {i + 1} ({t("common.optional")})</legend>
          <StreamSelect name={`loose.${i}.stream`} required={false} empty />
          <Field label={t("yard.grade")} name={`loose.${i}.grade`} optional>{(p) => <Input {...p} maxLength={40} />}</Field>
          <Field label={t("yard.weightKg")} name={`loose.${i}.weightKg`} optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
        </fieldset>
      ))}
      <fieldset>
        <legend className="text-sm font-medium text-ink-900">{t("yard.pricesPerKg")}</legend>
        <p className="mt-1 text-xs text-ink-600">{t("yard.priceNote")}</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">{streams.map((s) => <Field key={s} label={t(`enums.MaterialStream.${s}`)} name={`price.${s}`} optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>)}</div>
      </fieldset>
      <div><SubmitButton>{t("yard.createSale")}</SubmitButton></div>
    </ActionForm>
  );
}

export function DeliverSaleForm({ saleId }: { saleId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deliverSaleAction} hidden={{ saleId }} className="flex flex-wrap items-end gap-2">
      <Field label={t("yard.buyerWeighedKg")} name="buyerWeighedKg" optional className="w-56">{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
      <SubmitButton>{t("yard.markDelivered")}</SubmitButton>
    </ActionForm>
  );
}

export function ClaimForm({ saleId }: { saleId: string }) {
  const { t } = useI18n();
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-brand-700 hover:underline">{t("yard.recordClaim")}</summary>
      <ActionForm action={recordClaimAction} hidden={{ saleId }} className="mt-3 grid gap-2 sm:grid-cols-3">
        <Field label={t("yard.claimKg")} name="claimKg" optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
        <Field label={t("yard.claimAmount")} name="claimAmount" optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
        <Field label={t("yard.reason")} name="claimReason">{(p) => <Input {...p} required maxLength={300} />}</Field>
        <div className="sm:col-span-3"><SubmitButton variant="secondary">{t("yard.recordClaim")}</SubmitButton></div>
      </ActionForm>
    </details>
  );
}
