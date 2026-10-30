"use client";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { acceptInvitationAction } from "@/app/actions/public";

export function InviteForm({ token, existing }: { token: string; existing: boolean }) {
  const { t } = useI18n();
  return (
    <ActionForm action={acceptInvitationAction} className="space-y-4" hidden={{ token }}>
      {existing ? (
        <p className="text-sm text-ink-600">{t("auth.inviteExisting")}</p>
      ) : (
        <Field label={t("auth.yourName")} name="name">{(p) => <Input {...p} autoComplete="name" required />}</Field>
      )}
      <Field label={t("auth.password")} name="password" hint={existing ? undefined : t("auth.passwordHint")}>
        {(p) => <Input {...p} type="password" autoComplete={existing ? "current-password" : "new-password"} required />}
      </Field>
      <SubmitButton className="w-full">{t("auth.accept")}</SubmitButton>
    </ActionForm>
  );
}
