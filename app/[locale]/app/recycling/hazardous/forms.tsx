"use client";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { NOMENCLATURE_06_104 } from "@/lib/nomenclature-06-104";
import { createMovementAction, deliverMovementAction, pickUpMovementAction, refuseMovementAction, setTransportAuthorisationAction } from "@/app/actions/business";

const CONSISTENCIES = ["SOLID", "LIQUID", "GASEOUS", "PASTY"] as const;
// Only class SD (annex III) can travel under décret 04-409.
const SD_CODES = NOMENCLATURE_06_104.filter((e) => e[1] === "SD");

export function AuthorisationForm({ number, expiresOn }: { number: string | null; expiresOn: string | null }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setTransportAuthorisationAction} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end" successMessage={t("common.saved")}>
      <Field label={t("hazardous.authNumber")} name="hazTransportAuthNumber" optional>{(p) => <Input {...p} defaultValue={number ?? ""} maxLength={80} dir="ltr" />}</Field>
      <Field label={t("hazardous.authExpires")} name="hazTransportAuthExpiresOn" optional>{(p) => <Input {...p} type="date" defaultValue={expiresOn ?? ""} dir="ltr" />}</Field>
      <SubmitButton variant="secondary">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}

export function MovementForm({ customers, destinations, vehicles }: { customers: { id: string; name: string }[]; destinations: { id: string; name: string; registrationNumber: string }[]; vehicles: { id: string; plateNumber: string }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createMovementAction} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("hazardous.shipper")} name="customerId">{(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
      <Field label={t("hazardous.consignee")} name="destinationId" hint={destinations.length ? undefined : t("hazardous.noLicensedDestination")}>
        {(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{destinations.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.registrationNumber}</option>)}</Select>}
      </Field>
      <Field label={t("hazardous.wasteCode")} name="wasteCode" hint={t("hazardous.wasteCodeHint")}>
        {(p) => <><Input {...p} list="sd-codes" required dir="ltr" inputMode="decimal" placeholder="16.6.1" /><datalist id="sd-codes">{SD_CODES.map((e) => <option key={e[0]} value={e[0]}>{e[2]}</option>)}</datalist></>}
      </Field>
      <Field label={t("hazardous.consistency")} name="consistency">{(p) => <Select {...p} defaultValue="SOLID">{CONSISTENCIES.map((c) => <option key={c} value={c}>{t(`enums.WasteConsistency.${c}`)}</option>)}</Select>}</Field>
      <Field label={t("hazardous.quantityKg")} name="quantityKg">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <Field label={t("hazardous.vehicle")} name="vehicleId" optional>{(p) => <Select {...p} defaultValue=""><option value="">—</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}</Select>}</Field>
      <Field label={t("hazardous.packaging")} name="packaging" className="sm:col-span-2" hint={t("hazardous.packagingHint")}>{(p) => <Input {...p} required maxLength={200} />}</Field>
      <div className="sm:col-span-2"><Checkbox name="labelled" label={t("hazardous.labelled")} /></div>
      <div className="sm:col-span-2"><SubmitButton>{t("hazardous.create")}</SubmitButton></div>
    </ActionForm>
  );
}

export function PickUpForm({ movementId }: { movementId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={pickUpMovementAction} hidden={{ movementId }} className="flex flex-wrap items-end gap-2">
      <Field label={t("hazardous.shipperSignedName")} name="shipperSignedName" className="min-w-56 flex-1">{(p) => <Input {...p} required maxLength={120} />}</Field>
      <SubmitButton>{t("hazardous.pickUp")}</SubmitButton>
    </ActionForm>
  );
}

export function DeliverForm({ movementId }: { movementId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deliverMovementAction} hidden={{ movementId }} className="space-y-3">
      <Field label={t("hazardous.consigneeSignedName")} name="consigneeSignedName">{(p) => <Input {...p} required maxLength={120} />}</Field>
      <Checkbox name="decontaminated" required label={t("hazardous.decontaminated")} />
      <div><SubmitButton>{t("hazardous.deliver")}</SubmitButton></div>
    </ActionForm>
  );
}

export function RefuseForm({ movementId }: { movementId: string }) {
  const { t } = useI18n();
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-medium text-danger-700 hover:underline">{t("hazardous.refuse")}</summary>
      <ActionForm action={refuseMovementAction} hidden={{ movementId }} className="mt-3 space-y-3">
        <Field label={t("hazardous.refusedBy")} name="refusedByRole">{(p) => <Select {...p} defaultValue="CONSIGNEE">{(["SHIPPER", "CARRIER", "CONSIGNEE"] as const).map((r) => <option key={r} value={r}>{t(`hazardous.role.${r}`)}</option>)}</Select>}</Field>
        <Field label={t("hazardous.refusalReason")} name="refusalReason">{(p) => <Textarea {...p} required maxLength={500} />}</Field>
        <SubmitButton variant="danger">{t("hazardous.confirmRefusal")}</SubmitButton>
      </ActionForm>
    </details>
  );
}
