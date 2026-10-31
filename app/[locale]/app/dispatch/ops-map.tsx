"use client";
import { LeafletMap, type MapPoint, type MapRoute } from "@/components/map";
import { useI18n } from "@/components/i18n-provider";

export function OpsMap({ points, routes }: { points: MapPoint[]; routes: MapRoute[] }) {
  const { t } = useI18n();
  return <LeafletMap className="h-[22rem] rounded-none border-0" label={t("schedule.opsMap")} points={points} routes={routes} />;
}
