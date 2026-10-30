"use client";
import { LeafletMap, STATUS_COLORS } from "@/components/map";
import { useI18n } from "@/components/i18n-provider";

export function PublicMap({ points }: { points: { id: string; lat: number; lng: number; status: string; label: string }[] }) {
  const { t } = useI18n();
  return <LeafletMap className="h-[60vh]" label={t("civic.publicMapTitle")} points={points.map((p) => ({ ...p, color: STATUS_COLORS[p.status] ?? "#5a6b65" }))} />;
}
