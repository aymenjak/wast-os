"use client";
import { useState } from "react";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { customerFeedbackAction } from "@/app/actions/business";

export function FeedbackForm({ workOrderId }: { workOrderId: string }) {
  const { t } = useI18n();
  const [dispute, setDispute] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <span className="text-sm text-success-700">{t("portal.confirmed")}</span>;
  if (dispute)
    return (
      <ActionForm action={customerFeedbackAction} hidden={{ workOrderId, decision: "dispute" }} className="flex items-end gap-2">
        <Field label={t("workOrders.disputeReason")} name="disputeReason">{(p) => <Input {...p} required />}</Field>
        <SubmitButton size="sm" variant="danger">{t("portal.dispute")}</SubmitButton>
      </ActionForm>
    );
  return (
    <div className="flex gap-2">
      <ActionForm action={customerFeedbackAction} hidden={{ workOrderId, decision: "confirm" }} onResult={(s) => s.ok && setDone(true)}><SubmitButton size="sm" variant="subtle">{t("portal.confirm")}</SubmitButton></ActionForm>
      <button type="button" onClick={() => setDispute(true)} className="h-8 px-3 text-sm text-ink-600 hover:underline">{t("portal.dispute")}</button>
    </div>
  );
}
