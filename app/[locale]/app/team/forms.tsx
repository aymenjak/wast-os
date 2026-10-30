"use client";
import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { changeRoleAction, inviteMemberAction } from "@/app/actions/business";

export function InviteForm({ roles, customers, defaultCustomerId }: { roles: string[]; customers: { id: string; name: string }[]; defaultCustomerId?: string }) {
  const { t } = useI18n();
  const [role, setRole] = useState(defaultCustomerId ? "CUSTOMER_PORTAL" : roles.includes("DISPATCHER") ? "DISPATCHER" : roles[0]!);
  const [link, setLink] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <ActionForm action={inviteMemberAction} resetOnSuccess className="space-y-3" onResult={(s) => setLink(s.ok ? (s.data?.inviteUrl ?? null) : null)}>
        <Field label={t("common.email")} name="email">{(p) => <Input {...p} type="email" dir="ltr" required />}</Field>
        <Field label={t("team.role")} name="role">
          {(p) => <Select {...p} value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <option key={r} value={r}>{t(`enums.OrgRole.${r}`)}</option>)}</Select>}
        </Field>
        {role === "CUSTOMER_PORTAL" ? (
          <Field label={t("team.customer")} name="customerId">
            {(p) => <Select {...p} defaultValue={defaultCustomerId ?? ""} required><option value="" disabled>—</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}
          </Field>
        ) : null}
        <SubmitButton>{t("team.invite")}</SubmitButton>
      </ActionForm>
      {link ? (
        <div role="status" className="rounded-md bg-brand-50 p-3 text-sm">
          <p className="text-ink-700">{t("team.inviteLink")}</p>
          <p className="num mt-1 break-all font-mono text-xs text-ink-900" data-testid="invite-link">{link}</p>
          <button type="button" onClick={() => navigator.clipboard?.writeText(link)} className="mt-2 text-xs font-medium text-brand-700 hover:underline">{t("common.copy")}</button>
        </div>
      ) : null}
    </div>
  );
}

export function RoleForm({ membershipId, role, roles }: { membershipId: string; role: string; roles: string[] }) {
  const { t } = useI18n();
  return (
    <ActionForm action={changeRoleAction} hidden={{ membershipId }} className="flex items-center gap-2">
      <label htmlFor={`role-${membershipId}`} className="sr-only">{t("team.changeRole")}</label>
      <select id={`role-${membershipId}`} name="role" defaultValue={role} className="h-8 rounded-md border border-ink-300 bg-white px-2 text-sm">
        {roles.map((r) => <option key={r} value={r}>{t(`enums.OrgRole.${r}`)}</option>)}
      </select>
      <SubmitButton size="sm" variant="secondary">{t("common.save")}</SubmitButton>
    </ActionForm>
  );
}
