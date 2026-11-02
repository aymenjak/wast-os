"use client";
import { X } from "lucide-react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { addMaintenanceAction, addTeamMemberAction, createTeamAction, createVehicleAction, removeTeamMemberAction } from "@/app/actions/business";

export function VehicleForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createVehicleAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
      <Field label={t("fleet.plate")} name="plateNumber">{(p) => <Input {...p} dir="ltr" required />}</Field>
      <Field label={t("fleet.label")} name="label">{(p) => <Input {...p} required />}</Field>
      <Field label={t("fleet.type")} name="type">
        {(p) => <Select {...p}>{(["COMPACTOR", "TIPPER", "SKIP_LOADER", "HOOK_LIFT", "VAN", "OTHER"] as const).map((v) => <option key={v} value={v}>{t(`enums.VehicleType.${v}`)}</option>)}</Select>}
      </Field>
      <Field label={t("fleet.capacity")} name="capacityKg" optional>{(p) => <Input {...p} type="number" min={1} dir="ltr" />}</Field>
      <Field label={t("fleet.odometer")} name="odometerKm" optional>{(p) => <Input {...p} type="number" min={0} dir="ltr" />}</Field>
      <Field label={t("fleet.restrictions")} name="restrictions" optional>{(p) => <Input {...p} />}</Field>
      <div className="sm:col-span-2"><SubmitButton size="sm">{t("fleet.newVehicle")}</SubmitButton></div>
    </ActionForm>
  );
}

export function TeamForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createTeamAction} resetOnSuccess className="flex items-end gap-2">
      <Field label={t("fleet.teamName")} name="name" className="flex-1">{(p) => <Input {...p} required />}</Field>
      <SubmitButton size="md" variant="secondary">{t("fleet.newTeam")}</SubmitButton>
    </ActionForm>
  );
}

export function AddMemberForm({ teamId, staff }: { teamId: string; staff: { id: string; name: string }[] }) {
  const { t } = useI18n();
  if (!staff.length) return null;
  return (
    <ActionForm action={addTeamMemberAction} hidden={{ teamId }} className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`m-${teamId}`}>{t("fleet.addMember")}</label>
      <select id={`m-${teamId}`} name="membershipId" required defaultValue="" className="h-8 min-w-0 flex-1 rounded-md border border-ink-300 bg-white px-2 text-sm">
        <option value="" disabled>{t("fleet.addMember")}</option>
        {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <SubmitButton size="sm" variant="subtle">{t("common.add")}</SubmitButton>
    </ActionForm>
  );
}

export function RemoveMember({ teamId, membershipId }: { teamId: string; membershipId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={removeTeamMemberAction} hidden={{ teamId, membershipId }} className="inline">
      <button type="submit" className="rounded-full p-0.5 text-ink-500 hover:bg-ink-200 hover:text-ink-900"><X aria-hidden className="size-3" /><span className="sr-only">{t("fleet.remove")}</span></button>
    </ActionForm>
  );
}

export function MaintenanceForm({ vehicleId, today }: { vehicleId: string; today: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={addMaintenanceAction} hidden={{ vehicleId }} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
      <Field label={t("fleet.type")} name="kind">{(p) => <Select {...p}>{(["MAINTENANCE", "INSPECTION", "REPAIR"] as const).map((k) => <option key={k} value={k}>{t(`enums.MaintenanceKind.${k}`)}</option>)}</Select>}</Field>
      <Field label={t("fleet.performedAt")} name="performedAt">{(p) => <Input {...p} type="date" defaultValue={today} max={today} required />}</Field>
      <Field label={t("fleet.description")} name="description" className="sm:col-span-2">{(p) => <Textarea {...p} rows={2} required />}</Field>
      <Field label={t("fleet.cost")} name="cost" optional>{(p) => <Input {...p} inputMode="decimal" dir="ltr" />}</Field>
      <Field label={t("fleet.odometer")} name="odometerKm" optional>{(p) => <Input {...p} type="number" min={0} dir="ltr" />}</Field>
      <Field label={t("fleet.nextDue")} name="nextDueAt" optional>{(p) => <Input {...p} type="date" />}</Field>
      <div className="sm:col-span-2"><SubmitButton size="sm">{t("fleet.addMaintenance")}</SubmitButton></div>
    </ActionForm>
  );
}
