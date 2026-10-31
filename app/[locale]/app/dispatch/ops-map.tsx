"use client";
import { useEffect, useState } from "react";
import { LeafletMap, type MapPoint, type MapRoute, type MapVehicle } from "@/components/map";
import { useI18n } from "@/components/i18n-provider";

type Fix = { id: string; plate: string; label: string; lat: number; lng: number; at: string; speedKmh: number | null };
const POLL_MS = 30_000;
const STALE_MS = 15 * 60_000;

/** Today's stops plus live vehicles (GPS trackers), refreshed every 30 s while the tab is visible. */
export function OpsMap({ points, routes, initialVehicles, locale }: { points: MapPoint[]; routes: MapRoute[]; initialVehicles: Fix[]; locale: string }) {
  const { t } = useI18n();
  const [fixes, setFixes] = useState<Fix[]>(initialVehicles);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/fleet/positions", { cache: "no-store" });
        if (r.ok && !stop) setFixes((await r.json()).vehicles);
      } catch { /* keep last known positions */ }
      setNow(Date.now());
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { stop = true; clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const vehicles: MapVehicle[] = fixes.map((f) => ({ id: f.id, lat: f.lat, lng: f.lng, stale: now - Date.parse(f.at) > STALE_MS, label: `${f.plate} · ${f.label}`, href: `/${locale}/app/fleet/${f.id}` }));
  const ago = (iso: string) => Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  return (
    <div>
      <LeafletMap className="h-[22rem] rounded-none border-0" label={t("schedule.opsMap")} points={points} routes={routes} vehicles={vehicles} />
      {fixes.length ? (
        <ul aria-label={t("iot.vehiclesTracked")} aria-live="polite" className="flex flex-wrap gap-x-5 gap-y-1 border-t border-ink-100 px-4 py-2 text-xs text-ink-700">
          {fixes.map((f) => (
            <li key={f.id} className="flex items-center gap-1.5">
              <span aria-hidden className={`inline-block size-2.5 rounded-sm ${now - Date.parse(f.at) > STALE_MS ? "bg-ink-500" : "bg-ink-900 ring-2 ring-hivis-600"}`} />
              <span className="num font-medium text-ink-900">{f.plate}</span>
              <span>{t("iot.minutesAgo", { n: ago(f.at) })}{f.speedKmh != null ? ` · ${f.speedKmh} km/h` : ""}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
