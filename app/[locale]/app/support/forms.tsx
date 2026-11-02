"use client";
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { createTicketAction, grantSupportAction, replyTicketAction } from "@/app/actions/support";

export function TicketForm() {
  const { t } = useI18n();
  return (
    <ActionForm action={createTicketAction} className="grid gap-4 sm:grid-cols-2">
      <Field label={t("support.subject")} name="subject" className="sm:col-span-2">{(p) => <Input {...p} required />}</Field>
      <Field label={t("support.category")} name="category">
        {(p) => <Select {...p}>{(["QUESTION", "BUG", "BILLING", "ACCESS", "FEATURE"] as const).map((c) => <option key={c} value={c}>{t(`enums.TicketCategory.${c}`)}</option>)}</Select>}
      </Field>
      <Field label={t("requests.priority")} name="priority">
        {(p) => <Select {...p} defaultValue="NORMAL">{(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((c) => <option key={c} value={c}>{t(`enums.Priority.${c}`)}</option>)}</Select>}
      </Field>
      <Field label={t("support.message")} name="body" className="sm:col-span-2">{(p) => <Textarea {...p} rows={5} required minLength={5} />}</Field>
      <div className="sm:col-span-2"><SubmitButton>{t("support.send")}</SubmitButton></div>
    </ActionForm>
  );
}

export function GrantForm({ tickets }: { tickets: { id: string; label: string }[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={grantSupportAction} className="space-y-3" resetOnSuccess>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink-800">{t("support.duration")}</legend>
        <div className="flex gap-2">
          {[1, 4, 24].map((h, i) => (
            <label key={h} className="cursor-pointer">
              <input type="radio" name="hours" value={h} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-flex h-9 min-w-14 items-center justify-center rounded-[var(--radius-control)] border border-ink-300 bg-white px-3 text-sm peer-checked:border-ink-900 peer-checked:bg-ink-900 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-hivis-600">{t("support.hours", { n: h })}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {tickets.length ? (
        <Field label={t("support.tickets")} name="ticketId" optional>
          {(p) => <Select {...p} defaultValue=""><option value="">—</option>{tickets.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</Select>}
        </Field>
      ) : null}
      <Field label={t("support.reason")} name="reason">{(p) => <Input {...p} required />}</Field>
      <SubmitButton variant="secondary">{t("support.grant")}</SubmitButton>
    </ActionForm>
  );
}

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const { t } = useI18n();
  return (
    <ActionForm action={replyTicketAction} hidden={{ ticketId }} className="space-y-3" resetOnSuccess>
      <Field label={t("support.reply")} name="body">{(p) => <Textarea {...p} rows={3} required />}</Field>
      <SubmitButton>{t("support.send")}</SubmitButton>
    </ActionForm>
  );
}
