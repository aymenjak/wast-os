"use client";
import dynamic from "next/dynamic";

export const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-[var(--radius-control)] bg-ink-100" />,
});
export type { MapPoint } from "./leaflet-map";

export const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: "#a1520a", UNDER_REVIEW: "#a1520a", VERIFIED: "#1d4ed8", ASSIGNED: "#1d4ed8", IN_PROGRESS: "#0e7563",
  RESOLVED: "#15803d", CONFIRMED: "#15803d", DISPUTED: "#b91c1c", REOPENED: "#b91c1c", REJECTED: "#5a6b65", DUPLICATE: "#5a6b65", CANCELLED: "#5a6b65",
};
