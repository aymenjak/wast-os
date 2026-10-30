"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionForm, Field, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { citizenFeedbackAction } from "@/app/actions/public";

export function CitizenFeedback({ trackingCode }: { trackingCode: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [dispute, setDispute] = useState(false);
  return (
    <section className="mt-10 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5">
      <h2 className="font-semibold text-ink-900">{t("civic.confirmTitle")}</h2>
      {!dispute ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionForm action={citizenFeedbackAction} hidden={{ trackingCode, decision: "confirm" }} onResult={(s) => s.ok && router.refresh()}>
            <SubmitButton>{t("civic.confirmYes")}</SubmitButton>
          </ActionForm>
          <button type="button" onClick={() => setDispute(true)} className="h-10 rounded-[var(--radius-control)] border border-ink-200 px-4 text-sm font-medium text-ink-800 hover:bg-ink-50">{t("civic.disputeNo")}</button>
        </div>
      ) : (
        <ActionForm action={citizenFeedbackAction} className="mt-4 space-y-3" hidden={{ trackingCode, decision: "dispute" }} onResult={(s) => s.ok && router.refresh()}>
          <Field label={t("civic.disputeReason")} name="reason">{(p) => <Textarea {...p} required />}</Field>
          <SubmitButton variant="danger">{t("common.submit")}</SubmitButton>
        </ActionForm>
      )}
    </section>
  );
}
