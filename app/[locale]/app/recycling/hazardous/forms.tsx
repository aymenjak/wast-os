"use client";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { NOMENCLATURE_06_104 } from "@/lib/nomenclature-06-104";
import { TREATMENT_OPERATIONS } from "@/lib/treatment-operations";
import { confirmTreatmentAction, createAuthorisationAction, createMovementAction, deliverMovementAction, pickUpMovementAction, refuseMovementAction } from "@/app/actions/business";

const CONSISTENCIES = ["SOLID", "LIQUID", "GASEOUS", "PASTY"] as const;
// Only class SD (annex III) can travel under décret 04-409.
const SD_CODES = NOMENCLATURE_06_104.filter((e) => e[1] === "SD");

export function AuthorisationForm({ vehicles }: { vehicles: { id: string; plateNumber: string }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createAuthorisationAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("common.saved")}>
      <Field label={t("hazardous.authNumber")} name="number">{(p) => <Input {...p} required maxLength={80} dir="ltr" />}</Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("hazardous.validFrom")} name="validFrom">{(p) => <Input {...p} type="date" required dir="ltr" />}</Field>
        <Field label={t("hazardous.validUntil")} name="validUntil">{(p) => <Input {...p} type="date" required dir="ltr" />}</Field>
      </div>
      <Field label={t("hazardous.authCodes")} name="wasteCodes" className="sm:col-span-2" hint={t("hazardous.authCodesHint")}>{(p) => <Input {...p} required dir="ltr" placeholder="16.6.1, 13.2.5" />}</Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink-900">{t("hazardous.authVehicles")}</legend>
        {vehicles.length === 0 ? <p className="mt-1 text-sm text-ink-600">{t("hazardous.noVehicles")}</p> : (
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{vehicles.map((v) => <Checkbox key={v.id} name="vehicleIds[]" value={v.id} label={<span className="num">{v.plateNumber}</span>} />)}</div>
        )}
      </fieldset>
      <Field label={t("hazardous.loadingPoint")} name="loadingPoint">{(p) => <Input {...p} required maxLength={200} />}</Field>
      <Field label={t("hazardous.unloadingPoint")} name="unloadingPoint">{(p) => <Input {...p} required maxLength={200} />}</Field>
      <Field label={t("hazardous.itinerary")} name="itinerary" optional className="sm:col-span-2">{(p) => <Input {...p} maxLength={500} />}</Field>
      <Field label={t("hazardous.crew")} name="crew" optional className="sm:col-span-2" hint={t("hazardous.crewHint")}>{(p) => <Textarea {...p} maxLength={1000} className="min-h-16" />}</Field>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("hazardous.addAuthorisation")}</SubmitButton></div>
    </ActionForm>
  );
}

export function MovementForm({ customers, destinations, vehicles, authorisations }: { customers: { id: string; name: string }[]; destinations: { id: string; name: string; registrationNumber: string }[]; vehicles: { id: string; plateNumber: string }[]; authorisations: { id: string; number: string; codes: string[] }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createMovementAction} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("hazardous.shipper")} name="customerId">{(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
      <Field label={t("hazardous.consignee")} name="destinationId" hint={destinations.length ? undefined : t("hazardous.noLicensedDestination")}>
        {(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{destinations.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.registrationNumber}</option>)}</Select>}
      </Field>
      <Field label={t("hazardous.authorisation")} name="authorisationId" className="sm:col-span-2" hint={authorisations.length ? undefined : t("hazardous.needAuthorisation")}>
        {(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{authorisations.map((a) => <option key={a.id} value={a.id}>{a.number} · {a.codes.join(", ")}</option>)}</Select>}
      </Field>
      <Field label={t("hazardous.wasteCode")} name="wasteCode" hint={t("hazardous.wasteCodeHint")}>
        {(p) => <><Input {...p} list="sd-codes" required dir="ltr" inputMode="decimal" placeholder="16.6.1" /><datalist id="sd-codes">{SD_CODES.map((e) => <option key={e[0]} value={e[0]}>{e[2]}</option>)}</datalist></>}
      </Field>
      <Field label={t("hazardous.consistency")} name="consistency">{(p) => <Select {...p} defaultValue="SOLID">{CONSISTENCIES.map((c) => <option key={c} value={c}>{t(`enums.WasteConsistency.${c}`)}</option>)}</Select>}</Field>
      <Field label={t("hazardous.quantityKg")} name="quantityKg">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" />}</Field>
      <div className="flex items-end pb-2"><Checkbox name="quantityEstimated" label={t("hazardous.quantityEstimated")} /></div>
      <Field label={t("hazardous.plannedOperation")} name="plannedOperation" optional className="sm:col-span-2" hint={t("hazardous.operationHint")}>
        {(p) => <Select {...p} defaultValue=""><option value="">—</option>{TREATMENT_OPERATIONS.map(([c, l]) => <option key={c} value={c} lang="fr">{c} — {l.length > 70 ? `${l.slice(0, 70)}…` : l}</option>)}</Select>}
      </Field>
      <Field label={t("hazardous.vehicle")} name="vehicleId" hint={t("hazardous.vehicleHint")}>{(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}</Select>}</Field>
      <Field label={t("hazardous.packageCount")} name="packageCount">{(p) => <Input {...p} type="number" min={1} max={500} defaultValue={1} dir="ltr" />}</Field>
      <Field label={t("hazardous.originAddress")} name="originAddress" optional hint={t("hazardous.originAddressHint")}>{(p) => <Input {...p} maxLength={300} />}</Field>
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

export function DeliverForm({ movementId, expectedKg }: { movementId: string; expectedKg: number }) {
  const { t } = useI18n();
  return (
    <ActionForm action={deliverMovementAction} hidden={{ movementId }} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("hazardous.consigneeSignedName")} name="consigneeSignedName" className="sm:col-span-2">{(p) => <Input {...p} required maxLength={120} />}</Field>
      <Field label={t("hazardous.receivedKg")} name="receivedKg">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" defaultValue={String(expectedKg)} />}</Field>
      <Field label={t("hazardous.refusedKg")} name="refusedKg" optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" placeholder="0" />}</Field>
      <Field label={t("hazardous.partialRefusalReason")} name="partialRefusalReason" optional className="sm:col-span-2" hint={t("hazardous.partialRefusalHint")}>{(p) => <Input {...p} maxLength={500} />}</Field>
      <div className="sm:col-span-2"><Checkbox name="decontaminated" required label={t("hazardous.decontaminated")} /></div>
      <div className="sm:col-span-2"><SubmitButton>{t("hazardous.deliver")}</SubmitButton></div>
    </ActionForm>
  );
}

export function TreatmentForm({ movementId, planned, minDate, maxDate }: { movementId: string; planned: string | null; minDate: string; maxDate: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={confirmTreatmentAction} hidden={{ movementId }} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("hazardous.treatmentCode")} name="treatmentCode" className="sm:col-span-2" hint={t("hazardous.operationHint")}>
        {(p) => <Select {...p} required defaultValue={planned ?? ""}><option value="" disabled>—</option>{TREATMENT_OPERATIONS.map(([c, l]) => <option key={c} value={c} lang="fr">{c} — {l.length > 70 ? `${l.slice(0, 70)}…` : l}</option>)}</Select>}
      </Field>
      <Field label={t("hazardous.treatmentDate")} name="treatmentDate">{(p) => <Input {...p} type="date" required min={minDate} max={maxDate} dir="ltr" />}</Field>
      <Field label={t("hazardous.treatmentSignedName")} name="treatmentSignedName">{(p) => <Input {...p} required maxLength={120} />}</Field>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("hazardous.confirmTreatment")}</SubmitButton></div>
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
