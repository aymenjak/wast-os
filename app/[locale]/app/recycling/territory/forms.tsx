"use client";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { assignContainerAction, createCampaignAction, createDropOffPointAction, setLocalTargetAction } from "@/app/actions/business";

const STREAMS = ["PAPER_CARDBOARD", "PET", "HDPE_PP", "PLASTIC_FILM", "MIXED_PLASTIC", "FERROUS", "ALUMINIUM", "GLASS", "ORGANIC", "WOOD", "TEXTILE", "INERT", "SPECIAL", "RESIDUAL"] as const;

export function TargetForm({ pct, year, label }: { pct: number | null; year: number | null; label: string | null }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setLocalTargetAction} className="grid gap-3 sm:grid-cols-[7rem_7rem_1fr_auto] sm:items-end" successMessage={t("common.saved")}>
      <Field label={t("territory.targetPct")} name="recoveryTargetPct" optional>{(p) => <Input {...p} type="number" min={1} max={100} defaultValue={pct ?? ""} dir="ltr" />}</Field>
      <Field label={t("territory.targetYear")} name="recoveryTargetYear" optional>{(p) => <Input {...p} type="number" min={2025} max={2100} defaultValue={year ?? ""} dir="ltr" />}</Field>
      <Field label={t("territory.targetLabel")} name="recoveryTargetLabel" optional>{(p) => <Input {...p} defaultValue={label ?? ""} maxLength={120} />}</Field>
      <SubmitButton variant="secondary">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}

export function CampaignForm({ communes }: { communes: string[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={createCampaignAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("common.saved")}>
      <Field label={t("common.name")} name="name" className="sm:col-span-2">{(p) => <Input {...p} required maxLength={120} />}</Field>
      <Field label={t("common.commune")} name="commune" className="sm:col-span-2">{(p) => <><Input {...p} required maxLength={80} list="communes" /><datalist id="communes">{communes.map((c) => <option key={c} value={c} />)}</datalist></>}</Field>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        <Field label={t("common.from")} name="startsOn">{(p) => <Input {...p} type="date" required dir="ltr" />}</Field>
        <Field label={t("common.to")} name="endsOn">{(p) => <Input {...p} type="date" required dir="ltr" />}</Field>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink-900">{t("territory.campaignStreams")}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{STREAMS.filter((s) => s !== "RESIDUAL").map((s) => <Checkbox key={s} name="streams[]" value={s} label={t(`enums.MaterialStream.${s}`)} />)}</div>
      </fieldset>
      <Field label={t("territory.campaignDescription")} name="description" optional className="sm:col-span-2">{(p) => <Textarea {...p} maxLength={1000} className="min-h-16" />}</Field>
      <div className="sm:col-span-2"><SubmitButton>{t("territory.addCampaign")}</SubmitButton></div>
    </ActionForm>
  );
}

export function DropOffForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createDropOffPointAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess successMessage={t("common.saved")}>
      <Field label={t("common.name")} name="name" className="sm:col-span-2">{(p) => <Input {...p} required maxLength={120} />}</Field>
      <Field label={t("common.commune")} name="commune" optional>{(p) => <Input {...p} maxLength={80} />}</Field>
      <Field label={t("common.wilaya")} name="wilaya" optional>{(p) => <Input {...p} maxLength={80} />}</Field>
      <Field label={t("common.address")} name="address" optional className="sm:col-span-2">{(p) => <Input {...p} maxLength={300} />}</Field>
      <Field label={t("territory.latitude")} name="latitude">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" placeholder="35.7300" />}</Field>
      <Field label={t("territory.longitude")} name="longitude">{(p) => <Input {...p} required inputMode="decimal" dir="ltr" placeholder="-0.5600" />}</Field>
      <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("territory.addPoint")}</SubmitButton></div>
    </ActionForm>
  );
}

export function AssignContainerForm({ points, containers }: { points: { id: string; name: string }[]; containers: { id: string; code: string }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={assignContainerAction} className="grid gap-3" resetOnSuccess successMessage={t("common.saved")}>
      <Field label={t("territory.container")} name="containerId" hint={containers.length ? undefined : t("territory.noFreeContainer")}>{(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{containers.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</Select>}</Field>
      <Field label={t("territory.point")} name="dropOffPointId">{(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{points.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}</Field>
      <Field label={t("recycling.stream")} name="stream">{(p) => <Select {...p} required defaultValue="PET">{STREAMS.map((s) => <option key={s} value={s}>{t(`enums.MaterialStream.${s}`)}</option>)}</Select>}</Field>
      <div><SubmitButton variant="secondary">{t("territory.placeContainer")}</SubmitButton></div>
    </ActionForm>
  );
}
