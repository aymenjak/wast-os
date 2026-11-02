"use client";
import { useState } from "react";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { InlineAction } from "@/components/inline-action";
import { useI18n } from "@/components/i18n-provider";
import { rejectRequestAction, validateRequestAction } from "@/app/actions/business";

export function RequestActions({ requestId }: { requestId: string }) {
  const { t } = useI18n();
  const [rejecting, setRejecting] = useState(false);
  if (rejecting)
    return (
      <ActionForm action={rejectRequestAction} hidden={{ requestId }} className="flex min-w-56 flex-col gap-2">
        <Field label={t("requests.rejectReason")} name="reason">{(p) => <Input {...p} required minLength={3} />}</Field>
        <div className="flex gap-2">
          <SubmitButton size="sm" variant="danger">{t("requests.reject")}</SubmitButton>
          <button type="button" className="text-sm text-ink-600 hover:underline" onClick={() => setRejecting(false)}>{t("common.cancel")}</button>
        </div>
      </ActionForm>
    );
  return (
    <div className="flex flex-wrap items-start gap-2">
      <InlineAction action={validateRequestAction} hidden={{ requestId }} label={t("requests.validate")} variant="primary" />
      <button type="button" onClick={() => setRejecting(true)} className="h-8 rounded-[var(--radius-control)] px-3 text-sm text-ink-700 hover:bg-ink-100">{t("requests.reject")}</button>
    </div>
  );
}
