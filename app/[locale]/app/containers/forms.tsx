"use client";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { createContainerAction, moveContainerAction } from "@/app/actions/business";

const TYPES = ["BIN_240L", "BIN_660L", "BIN_1100L", "SKIP_6M3", "SKIP_10M3", "ROLLOFF_20M3", "ROLLOFF_30M3", "COMPACTOR_UNIT", "OTHER"] as const;

export function ContainerForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createContainerAction} resetOnSuccess className="grid gap-3 sm:grid-cols-3 sm:items-end">
      <Field label={t("containers.code")} name="code">{(p) => <Input {...p} dir="ltr" required placeholder="SKP-012" />}</Field>
      <Field label={t("containers.type")} name="type">{(p) => <Select {...p}>{TYPES.map((x) => <option key={x} value={x}>{t(`enums.ContainerType.${x}`)}</option>)}</Select>}</Field>
      <SubmitButton variant="secondary">{t("containers.new")}</SubmitButton>
    </ActionForm>
  );
}

type Loc = { id: string; label: string };

/** Container moves. On a work order, `workOrderId` ties the move to the job (required for field workers). */
export function MoveForm({ containerId, action, label, locations, workOrderId, variant = "secondary" }: { containerId: string; action: string; label: string; locations?: Loc[]; workOrderId?: string; variant?: "primary" | "secondary" | "danger" | "subtle" }) {
  const { t } = useI18n();
  return (
    <ActionForm action={moveContainerAction} hidden={{ containerId, action, ...(workOrderId ? { workOrderId } : {}) }} className="flex flex-wrap items-end gap-2">
      {locations ? (
        locations.length === 1 ? <input type="hidden" name="serviceLocationId" value={locations[0]!.id} /> : (
          <Field label={t("containers.chooseLocation")} name="serviceLocationId">{(p) => <Select {...p} required defaultValue="">{[<option key="" value="" disabled>—</option>, ...locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)]}</Select>}</Field>
        )
      ) : null}
      <SubmitButton size="sm" variant={variant}>{label}</SubmitButton>
    </ActionForm>
  );
}
