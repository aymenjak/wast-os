"use client";
import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { registerIntegrationAction } from "@/app/actions/business";

export function IntegrationForm({ base }: { base: string }) {
  const { t } = useI18n();
  const [provider, setProvider] = useState<"CHIRPSTACK" | "TTN">("CHIRPSTACK");
  const [key, setKey] = useState<string | null>(null);
  const url = `${base}/api/iot/v1/lorawan/${provider === "CHIRPSTACK" ? "chirpstack" : "ttn"}`;
  return (
    <div className="space-y-4">
      <ActionForm action={registerIntegrationAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess onResult={(s) => s.ok && s.data?.key && setKey(s.data.key)}>
        <Field label={t("iot.provider")} name="provider">
          {(p) => <Select {...p} value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}><option value="CHIRPSTACK">ChirpStack v4</option><option value="TTN">The Things Stack (TTN v3)</option></Select>}
        </Field>
        <Field label={t("common.name")} name="name">{(p) => <Input {...p} required maxLength={80} />}</Field>
        <div className="sm:col-span-2"><SubmitButton variant="secondary">{t("iot.addIntegration")}</SubmitButton></div>
      </ActionForm>
      {key ? (
        <div className="space-y-2 rounded-[var(--radius-card)] border border-warning-700/30 bg-warning-100 p-4 text-sm" data-testid="integration-key">
          <p className="font-semibold text-warning-700">{t("iot.keyOnce")}</p>
          <dl dir="ltr" className="space-y-1 text-xs">
            <div><dt className="font-semibold">URL</dt><dd><code className="break-all">{url}</code></dd></div>
            <div><dt className="font-semibold">Header</dt><dd><code className="break-all">Authorization: Bearer {key}</code></dd></div>
          </dl>
          <p className="text-ink-700">{provider === "CHIRPSTACK" ? t("iot.chirpstackHow") : t("iot.ttnHow")}</p>
        </div>
      ) : null}
    </div>
  );
}
