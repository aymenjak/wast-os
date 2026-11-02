"use client";
import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { LeafletMap } from "./index";
import { Field, Input } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";

/** Map + manual coordinates. Typed coordinates are a first-class path (keyboard/screen-reader users, no GPS). */
export function LocationPicker({ initial }: { initial?: { lat: number; lng: number } | null }) {
  const { t } = useI18n();
  const [lat, setLat] = useState(initial ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial ? String(initial.lng) : "");
  const [status, setStatus] = useState<string | null>(null);
  const picked = lat && lng && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng)) ? { lat: Number(lat), lng: Number(lng) } : null;

  const pick = (p: { lat: number; lng: number }) => {
    setLat(p.lat.toFixed(6));
    setLng(p.lng.toFixed(6));
  };
  const locate = () => {
    if (!navigator.geolocation) return setStatus(t("common.locationUnavailable"));
    setStatus(t("common.locating"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus(null);
      },
      () => setStatus(t("common.locationUnavailable")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-600">{t("common.mapHint")}</p>
        <button type="button" onClick={locate} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50">
          <LocateFixed aria-hidden className="size-4" />
          {t("common.useMyLocation")}
        </button>
      </div>
      {status ? <p role="status" className="text-xs text-ink-600">{status}</p> : null}
      <LeafletMap picked={picked} onPick={pick} center={picked} zoom={picked ? 16 : 12} label={t("common.mapHint")} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("common.latitude")} name="latitude">
          {(p) => <Input {...p} inputMode="decimal" dir="ltr" value={lat} onChange={(e) => setLat(e.target.value)} />}
        </Field>
        <Field label={t("common.longitude")} name="longitude">
          {(p) => <Input {...p} inputMode="decimal" dir="ltr" value={lng} onChange={(e) => setLng(e.target.value)} />}
        </Field>
      </div>
    </div>
  );
}
