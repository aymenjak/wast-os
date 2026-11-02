"use client";
import { useMemo, useState } from "react";
import { CLASS_LETTER, NOMENCLATURE_06_104 } from "@/lib/nomenclature-06-104";
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { classifyCategoryAction, createDestinationAction } from "@/app/actions/business";

const KINDS = ["RECYCLER", "SORTING_CENTRE", "COMPOSTING", "ANAEROBIC_DIGESTION", "REUSE_REPAIR", "ENERGY_RECOVERY", "LANDFILL", "INCINERATION", "OTHER_DISPOSAL"] as const;
const STREAMS = ["PAPER_CARDBOARD", "PET", "HDPE_PP", "PLASTIC_FILM", "MIXED_PLASTIC", "FERROUS", "ALUMINIUM", "GLASS", "ORGANIC", "WOOD", "TEXTILE", "INERT", "SPECIAL", "RESIDUAL"] as const;
const CLASSES = ["HOUSEHOLD_SIMILAR", "INERT", "SPECIAL", "SPECIAL_HAZARDOUS"] as const;

export function DestinationForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createDestinationAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2" successMessage={t("common.saved")}>
      <Field label={t("common.name")} name="name">{(p) => <Input {...p} required maxLength={120} />}</Field>
      <Field label={t("recycling.kind")} name="kind">{(p) => <Select {...p} defaultValue="RECYCLER">{KINDS.map((k) => <option key={k} value={k}>{t(`enums.DestinationKind.${k}`)}</option>)}</Select>}</Field>
      <Field label={t("recycling.registrationNumber")} name="registrationNumber" optional hint={t("recycling.registrationHint")}>{(p) => <Input {...p} maxLength={80} />}</Field>
      <Field label={t("common.wilaya")} name="wilaya" optional>{(p) => <Input {...p} maxLength={80} />}</Field>
      <Field label={t("recycling.address")} name="address" optional className="sm:col-span-2">{(p) => <Input {...p} maxLength={300} />}</Field>
      <div className="sm:col-span-2"><Checkbox name="ownYard" label={t("yard.ownYardCheckbox")} /></div>
      <div className="sm:col-span-2"><SubmitButton>{t("recycling.addDestination")}</SubmitButton></div>
    </ActionForm>
  );
}

export function ClassifyForm({ category }: { category: { id: string; stream: string | null; regulatoryClass: (typeof CLASSES)[number]; nomenclatureCode: string | null } }) {
  const { t } = useI18n();
  const [cls, setCls] = useState(category.regulatoryClass);
  const listId = `nomen-${category.id}`;
  // Codes repeat across annexes II and III with different meanings: suggest only the ones of the chosen class.
  const options = useMemo(() => NOMENCLATURE_06_104.filter((e) => e[1] === CLASS_LETTER[cls]), [cls]);
  return (
    <ActionForm action={classifyCategoryAction} hidden={{ categoryId: category.id }} className="flex flex-wrap items-end gap-2" successMessage={t("common.saved")}>
      <Field label={t("recycling.stream")} name="stream" className="w-52">{(p) => <Select {...p} defaultValue={category.stream ?? ""}><option value="">—</option>{STREAMS.map((s) => <option key={s} value={s}>{t(`enums.MaterialStream.${s}`)}</option>)}</Select>}</Field>
      <Field label={t("recycling.regulatoryClass")} name="regulatoryClass" className="w-44">{(p) => <Select {...p} value={cls} onChange={(e) => setCls(e.target.value as typeof cls)}>{CLASSES.map((c) => <option key={c} value={c}>{t(`enums.RegulatoryClass.${c}`)}</option>)}</Select>}</Field>
      <Field label={t("recycling.nomenclatureCode")} name="nomenclatureCode" optional hint={t("recycling.codeHint")} className="w-32">{(p) => <Input {...p} list={listId} defaultValue={category.nomenclatureCode ?? ""} maxLength={8} dir="ltr" inputMode="decimal" placeholder="20.1.1" />}</Field>
      <datalist id={listId}>{options.map((e) => <option key={e[0]} value={e[0]}>{e[2]}</option>)}</datalist>
      <SubmitButton size="sm" variant="secondary">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}
