"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { ActionForm, Field, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { sendInvoiceEmailAction } from "@/app/actions/business";

export function SendInvoiceEmail({ invoiceId, defaultTo }: { invoiceId: string; defaultTo: string | null }) {
  const { t } = useI18n();
  const [done, setDone] = useState<{ to: string; configured: boolean } | null>(null);
  return (
    <div className="space-y-3">
      <ActionForm action={sendInvoiceEmailAction} hidden={{ invoiceId }} className="space-y-3" onResult={(s) => s.ok && s.data && setDone({ to: s.data.to!, configured: s.data.configured === "true" })}>
        <Field label={t("email.to")} name="to" hint={defaultTo ? undefined : t("email.noCustomerEmail")}>{(p) => <Input {...p} type="email" defaultValue={defaultTo ?? ""} required={!defaultTo} />}</Field>
        <Field label={t("email.message")} name="message" optional>{(p) => <Textarea {...p} rows={2} maxLength={1000} />}</Field>
        <SubmitButton variant="secondary"><Mail aria-hidden className="size-4" />{t("email.send")}</SubmitButton>
      </ActionForm>
      {done ? <p role="status" className="text-sm text-success-700">{(done.configured ? t("email.queued") : t("email.queuedNoSmtp")).replace("{to}", done.to)}</p> : null}
    </div>
  );
}
