"use client";
import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { reviewReportAction } from "@/app/actions/civic";

type Opt = { id: string; name: string };

export function ReviewForm({ reportId, next, teams, vehicles, priority, today }: { reportId: string; next: string[]; teams: Opt[]; vehicles: Opt[]; priority: string; today: string }) {
  const { t } = useI18n();
  const [to, setTo] = useState(next[0]!);
  const needsReason = ["REJECTED", "REOPENED"].includes(to);
  return (
    <ActionForm action={reviewReportAction} hidden={{ reportId }} className="space-y-3">
      <Field label={t("civic.moveTo")} name="to">
        {(p) => <Select {...p} value={to} onChange={(e) => setTo(e.target.value)}>{next.map((s) => <option key={s} value={s}>{t(`enums.CivicReportStatus.${s}`)}</option>)}</Select>}
      </Field>
      {to === "VERIFIED" || to === "ASSIGNED" ? (
        <Field label={t("requests.priority")} name="priority">
          {(p) => <Select {...p} defaultValue={priority}>{(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((x) => <option key={x} value={x}>{t(`enums.Priority.${x}`)}</option>)}</Select>}
        </Field>
      ) : null}
      {to === "ASSIGNED" ? (
        <>
          <Field label={t("civic.assignTeam")} name="teamId">{(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{teams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}</Field>
          <Field label={t("workOrders.vehicle")} name="vehicleId" optional>{(p) => <Select {...p}><option value="">{t("workOrders.noVehicle")}</option>{vehicles.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}</Field>
          <Field label={t("workOrders.scheduled")} name="scheduledDate">{(p) => <Input {...p} type="date" defaultValue={today} min={today} />}</Field>
        </>
      ) : null}
      {to === "DUPLICATE" ? <Field label={t("civic.markDuplicateOf")} name="duplicateOfTrackingCode">{(p) => <Input {...p} dir="ltr" placeholder="NX-XXXX-XXXX-XXXX" required />}</Field> : null}
      {needsReason ? <Field label={t("civic.internalReason")} name="reason">{(p) => <Textarea {...p} rows={2} required />}</Field> : null}
      <Field label={t("civic.publicNote")} name="publicNote" optional>{(p) => <Textarea {...p} rows={2} />}</Field>
      <SubmitButton className="w-full">{t("common.confirm")}</SubmitButton>
    </ActionForm>
  );
}
