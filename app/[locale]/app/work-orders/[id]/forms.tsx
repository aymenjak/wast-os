"use client";
import { useState } from "react";
import { Camera } from "lucide-react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea, Checkbox } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { addWeightAction, uploadEvidenceAction, workOrderTransitionAction , recordRejectsAction } from "@/app/actions/business";

const FAILURE_REASONS = ["NO_ACCESS", "CUSTOMER_ABSENT", "WASTE_NOT_READY", "WRONG_WASTE_TYPE", "VEHICLE_BREAKDOWN", "UNSAFE_CONDITIONS", "OTHER"] as const;

export function WorkOrderActions({ workOrderId, actions, today }: { workOrderId: string; actions: string[]; today: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<string | null>(null);
  const simple = actions.filter((a) => ["start", "unassign", "resolveDispute", "redo"].includes(a));
  const label = (a: string) => t(`workOrders.${a}`);

  if (mode === "complete")
    return (
      <ActionForm action={workOrderTransitionAction} hidden={{ workOrderId, action: "complete" }} className="space-y-3">
        <Field label={t("workOrders.completionNotes")} name="completionNotes" optional>{(p) => <Textarea {...p} rows={2} />}</Field>
        <div className="flex gap-2"><SubmitButton size="lg">{t("workOrders.complete")}</SubmitButton><Cancel onClick={() => setMode(null)} /></div>
      </ActionForm>
    );
  if (mode === "fail")
    return (
      <ActionForm action={workOrderTransitionAction} hidden={{ workOrderId, action: "fail" }} className="space-y-3">
        <Field label={t("workOrders.failureReason")} name="failureReason">
          {(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{FAILURE_REASONS.map((r) => <option key={r} value={r}>{t(`enums.FailureReason.${r}`)}</option>)}</Select>}
        </Field>
        <Field label={t("workOrders.failureNotes")} name="failureNotes" optional>{(p) => <Textarea {...p} rows={2} />}</Field>
        <div className="flex gap-2"><SubmitButton variant="danger" size="lg">{t("workOrders.fail")}</SubmitButton><Cancel onClick={() => setMode(null)} /></div>
      </ActionForm>
    );
  if (mode === "reschedule")
    return (
      <ActionForm action={workOrderTransitionAction} hidden={{ workOrderId, action: "reschedule" }} className="flex flex-wrap items-end gap-3">
        <Field label={t("workOrders.newDate")} name="scheduledDate">{(p) => <Input {...p} type="date" min={today} defaultValue={today} required />}</Field>
        <SubmitButton>{t("workOrders.reschedule")}</SubmitButton><Cancel onClick={() => setMode(null)} />
      </ActionForm>
    );
  if (mode === "cancel")
    return (
      <ActionForm action={workOrderTransitionAction} hidden={{ workOrderId, action: "cancel" }} className="flex gap-2">
        <SubmitButton variant="danger">{t("workOrders.cancel")}</SubmitButton><Cancel onClick={() => setMode(null)} />
      </ActionForm>
    );

  return (
    <div className="flex flex-wrap gap-2">
      {simple.map((a) => (
        <ActionForm key={a} action={workOrderTransitionAction} hidden={{ workOrderId, action: a }}>
          <SubmitButton size="lg" variant={a === "start" ? "primary" : "secondary"}>{label(a)}</SubmitButton>
        </ActionForm>
      ))}
      {actions.includes("complete") ? <button type="button" onClick={() => setMode("complete")} className="h-12 rounded-[var(--radius-control)] bg-brand-700 px-5 font-medium text-white hover:bg-brand-800">{t("workOrders.complete")}</button> : null}
      {actions.includes("fail") ? <button type="button" onClick={() => setMode("fail")} className="h-12 rounded-[var(--radius-control)] border border-danger-100 bg-white px-5 font-medium text-danger-700 hover:bg-danger-100">{t("workOrders.fail")}</button> : null}
      {actions.includes("reschedule") ? <button type="button" onClick={() => setMode("reschedule")} className="h-12 rounded-[var(--radius-control)] border border-ink-200 bg-white px-5 font-medium text-ink-800 hover:bg-ink-50">{t("workOrders.reschedule")}</button> : null}
      {actions.includes("cancel") ? <button type="button" onClick={() => setMode("cancel")} className="h-12 rounded-[var(--radius-control)] px-4 text-sm text-ink-600 hover:bg-ink-100">{t("workOrders.cancel")}</button> : null}
    </div>
  );
}

function Cancel({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return <button type="button" onClick={onClick} className="h-10 px-3 text-sm text-ink-600 hover:underline">{t("common.cancel")}</button>;
}

export function EvidenceUpload({ workOrderId }: { workOrderId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={uploadEvidenceAction} hidden={{ workOrderId }} encType="multipart/form-data" resetOnSuccess className="flex flex-wrap items-end gap-3 rounded-md bg-ink-50 p-3">
      <Field label={t("workOrders.photoKind")} name="kind">
        {(p) => <Select {...p} defaultValue="AFTER"><option value="BEFORE">{t("enums.EvidenceKind.BEFORE")}</option><option value="AFTER">{t("enums.EvidenceKind.AFTER")}</option><option value="DOCUMENT">{t("enums.EvidenceKind.DOCUMENT")}</option></Select>}
      </Field>
      <Field label={t("workOrders.addPhoto")} name="file" hint={t("workOrders.uploadHint")} className="min-w-0 flex-1">
        {(p) => <input {...p} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" required className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:ring-1 file:ring-ink-200" />}
      </Field>
      <SubmitButton variant="subtle"><Camera aria-hidden className="size-4" />{t("workOrders.upload")}</SubmitButton>
    </ActionForm>
  );
}

const STREAMS = ["PAPER_CARDBOARD", "PET", "HDPE_PP", "PLASTIC_FILM", "MIXED_PLASTIC", "FERROUS", "ALUMINIUM", "GLASS", "ORGANIC", "WOOD", "TEXTILE", "INERT", "SPECIAL", "RESIDUAL"] as const;

export function WeightForm({ workOrderId, defaultStream, destinations }: { workOrderId: string; defaultStream?: string | null; destinations: { id: string; name: string; kind: string }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={addWeightAction} hidden={{ workOrderId }} resetOnSuccess className="grid gap-3 sm:grid-cols-4 sm:items-end">
      <Field label={t("workOrders.ticketNumber")} name="ticketNumber" optional>{(p) => <Input {...p} dir="ltr" />}</Field>
      <Field label={t("workOrders.grossKg")} name="grossKg">{(p) => <Input {...p} inputMode="decimal" dir="ltr" required />}</Field>
      <Field label={t("workOrders.tareKg")} name="tareKg">{(p) => <Input {...p} inputMode="decimal" dir="ltr" required />}</Field>
      <Field label={t("workOrders.facility")} name="facility" optional>{(p) => <Input {...p} />}</Field>
      <Field label={t("recycling.stream")} name="stream">
        {(p) => <Select {...p} defaultValue={defaultStream ?? ""}><option value="">—</option>{STREAMS.map((s) => <option key={s} value={s}>{t(`enums.MaterialStream.${s}`)}</option>)}</Select>}
      </Field>
      <Field label={t("recycling.destination")} name="destinationId" optional hint={destinations.length ? undefined : t("recycling.noDestinationsHint")}>
        {(p) => <Select {...p} defaultValue=""><option value="">—</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name} · {t(`enums.DestinationKind.${d.kind}`)}</option>)}</Select>}
      </Field>
      <div className="pb-2"><Checkbox name="contaminated" label={t("recycling.contaminated")} /></div>
      <SubmitButton variant="secondary">{t("workOrders.addWeight")}</SubmitButton>
    </ActionForm>
  );
}

export function RejectsForm({ ticketId }: { ticketId: string }) {
  const { t } = useI18n();
  return (
    // Collapsed so the ticket table keeps its width; opens in place when the processor reports rejects.
    <details className="text-sm">
      <summary className="cursor-pointer text-brand-700 hover:underline">{t("common.edit")}</summary>
      <ActionForm action={recordRejectsAction} hidden={{ ticketId }} className="mt-2 flex items-end gap-1">
        <Field label={t("recycling.rejectedKg")} name="rejectedKg">{(p) => <Input {...p} inputMode="decimal" dir="ltr" className="h-8 w-24" />}</Field>
        <SubmitButton size="sm" variant="secondary">{t("common.save")}</SubmitButton>
      </ActionForm>
    </details>
  );
}
