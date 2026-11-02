"use client";
import { useRouter } from "next/navigation";
import { ActionForm, Field, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { staffReplyAction } from "@/app/actions/support";

export function StaffReplyForm({ ticketId }: { ticketId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <ActionForm action={staffReplyAction} hidden={{ ticketId }} className="space-y-3" resetOnSuccess onResult={(s) => s.ok && router.refresh()}>
      <Field label={t("support.reply")} name="body">{(p) => <Textarea {...p} rows={4} required />}</Field>
      <Field label={t("common.status")} name="status">
        {(p) => <Select {...p} defaultValue="WAITING_CUSTOMER">{(["WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const).map((x) => <option key={x} value={x}>{t(`enums.TicketStatus.${x}`)}</option>)}</Select>}
      </Field>
      <SubmitButton>{t("support.send")}</SubmitButton>
    </ActionForm>
  );
}
