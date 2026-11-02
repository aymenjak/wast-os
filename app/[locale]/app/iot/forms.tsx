"use client";
import { useState } from "react";
import { ActionForm, Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { registerDeviceAction } from "@/app/actions/business";

export function DeviceForm({ containers, vehicles, endpoint }: { containers: { id: string; code: string }[]; vehicles: { id: string; plateNumber: string }[]; endpoint: string }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<"FILL_SENSOR" | "GPS_TRACKER">("FILL_SENSOR");
  const [key, setKey] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <ActionForm action={registerDeviceAction} className="grid gap-3 sm:grid-cols-2" resetOnSuccess onResult={(s) => s.ok && s.data?.key && setKey(s.data.key)}>
        <Field label={t("iot.kind")} name="kind">
          {(p) => <Select {...p} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="FILL_SENSOR">{t("iot.kinds.FILL_SENSOR")}</option><option value="GPS_TRACKER">{t("iot.kinds.GPS_TRACKER")}</option></Select>}
        </Field>
        {kind === "FILL_SENSOR" ? (
          <Field label={t("iot.container")} name="containerId">{(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{containers.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</Select>}</Field>
        ) : (
          <Field label={t("iot.vehicle")} name="vehicleId">{(p) => <Select {...p} required defaultValue=""><option value="" disabled>—</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}</Select>}</Field>
        )}
        <Field label={t("common.name")} name="name">{(p) => <Input {...p} required maxLength={80} />}</Field>
        <Field label={t("iot.serial")} name="serial">{(p) => <Input {...p} required maxLength={80} />}</Field>
        <div className="sm:col-span-2"><SubmitButton>{t("iot.register")}</SubmitButton></div>
      </ActionForm>
      {key ? (
        <div className="space-y-2 rounded-[var(--radius-card)] border border-warning-700/30 bg-warning-100 p-4 text-sm" data-testid="device-key">
          <p className="font-semibold text-warning-700">{t("iot.keyOnce")}</p>
          <code className="num block rounded bg-white px-2 py-1.5 text-xs break-all">{key}</code>
          <p className="text-ink-700">{t("iot.howTo")}</p>
          <pre dir="ltr" className="overflow-x-auto rounded bg-ink-900 p-3 text-xs text-white">{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '${kind === "FILL_SENSOR" ? `{"readings":[{"measuredAt":"${new Date().toISOString()}","fillPct":42,"batteryPct":90}]}` : `{"positions":[{"recordedAt":"${new Date().toISOString()}","lat":35.6971,"lng":-0.6308,"speedKmh":25}]}`}'`}</pre>
        </div>
      ) : null}
    </div>
  );
}
