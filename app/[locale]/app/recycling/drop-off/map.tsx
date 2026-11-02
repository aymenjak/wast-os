"use client";
import { LeafletMap, type MapPoint } from "@/components/map";

export function DropOffMap({ points, label }: { points: MapPoint[]; label: string }) {
  return <LeafletMap points={points} label={label} />;
}
