"use client";
import { useState } from "react";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { confirmMfaAction, disableMfaAction, regenerateCodesAction, startMfaAction } from "@/app/actions/account";

function Codes({ codes }: { codes: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-[var(--radius-card)] border border-warning-700/30 bg-warning-100 p-4" data-testid="recovery-codes">
      <p className="mb-3 text-sm font-semibold text-warning-700">{t("mfa.saveCodes")}</p>
      <ul className="num grid grid-cols-2 gap-1 font-mono text-sm text-ink-950">{codes.split(" ").map((c) => <li key={c}>{c}</li>)}</ul>
      <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-[var(--radius-control)] border border-ink-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-ink-50">{t("mfa.done")}</button>
    </div>
  );
}

const CodeField = ({ label }: { label: string }) => (
  <Field label={label} name="code">{(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" required maxLength={11} className="num max-w-40 tracking-widest" />}</Field>
);

export function EnrollMfa() {
  const { t } = useI18n();
  const [setup, setSetup] = useState<{ secret: string; qrSvg: string } | null>(null);
  const [codes, setCodes] = useState<string | null>(null);
  if (codes) return <Codes codes={codes} />;
  if (!setup) {
    return (
      <ActionForm action={startMfaAction} onResult={(s) => s.ok && s.data && setSetup({ secret: s.data.secret!, qrSvg: s.data.qrSvg! })}>
        <SubmitButton>{t("mfa.enable")}</SubmitButton>
      </ActionForm>
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
      {/* SVG generated on our server from our own otpauth URI. */}
      <div className="size-44 rounded-md border border-ink-200 bg-white p-2 [&_svg]:size-full" aria-label={t("mfa.qr")} role="img" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} />
      <div className="space-y-4">
        <ol className="list-decimal space-y-1 ps-5 text-sm text-ink-800"><li>{t("mfa.step1")}</li><li>{t("mfa.step2")}</li></ol>
        <p className="text-sm text-ink-700">{t("mfa.manualKey")} <code className="num rounded bg-ink-100 px-1.5 py-0.5 text-xs break-all" data-testid="totp-secret">{setup.secret}</code></p>
        <ActionForm action={confirmMfaAction} className="flex flex-wrap items-end gap-2" onResult={(s) => s.ok && s.data?.codes && setCodes(s.data.codes)}>
          <CodeField label={t("mfa.code")} />
          <SubmitButton>{t("mfa.confirm")}</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}

export function RegenerateCodes() {
  const { t } = useI18n();
  const [codes, setCodes] = useState<string | null>(null);
  return codes ? <Codes codes={codes} /> : (
    <ActionForm action={regenerateCodesAction} className="flex flex-wrap items-end gap-2" onResult={(s) => s.ok && s.data?.codes && setCodes(s.data.codes)}>
      <CodeField label={t("mfa.code")} />
      <SubmitButton variant="secondary">{t("mfa.regenerate")}</SubmitButton>
    </ActionForm>
  );
}

export function DisableMfa() {
  const { t } = useI18n();
  return (
    <ActionForm action={disableMfaAction} className="flex flex-wrap items-end gap-2 border-t border-ink-100 pt-4">
      <CodeField label={t("mfa.code")} />
      <SubmitButton variant="danger">{t("mfa.disable")}</SubmitButton>
    </ActionForm>
  );
}
