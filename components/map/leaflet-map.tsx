"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import L from "leaflet";

/**
 * Tile source is configuration, not code. The default public OSM server is acceptable for
 * development and low-volume pilots only (OSMF tile usage policy); production must set
 * NEXT_PUBLIC_MAP_TILE_URL to a contracted or self-hosted tile service. See docs/mcp & ARCHITECTURE.md.
 */
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type MapPoint = { id: string; lat: number; lng: number; color: string; label: string; href?: string };

const ALGIERS: [number, number] = [36.7538, 3.0588];

export default function LeafletMap({
  points = [],
  picked,
  onPick,
  center,
  zoom = 12,
  className = "h-80",
  label,
}: {
  points?: MapPoint[];
  picked?: { lat: number; lng: number } | null;
  onPick?: (p: { lat: number; lng: number }) => void;
  center?: { lat: number; lng: number } | null;
  zoom?: number;
  className?: string;
  label: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickMarker = useRef<L.CircleMarker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const start = center ?? (points[0] ? { lat: points[0].lat, lng: points[0].lng } : { lat: ALGIERS[0], lng: ALGIERS[1] });
    const m = L.map(el.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], zoom);
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => onPickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = layer.current;
    if (!g || !map.current) return;
    g.clearLayers();
    for (const p of points) {
      const mk = L.circleMarker([p.lat, p.lng], { radius: 7, color: "#fff", weight: 2, fillColor: p.color, fillOpacity: 0.95 });
      const content = p.href ? `<a href="${encodeURI(p.href)}">${escapeHtml(p.label)}</a>` : escapeHtml(p.label);
      mk.bindTooltip(content).bindPopup(content);
      mk.addTo(g);
    }
    if (points.length > 1 && !center) map.current.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [24, 24], maxZoom: 15 });
  }, [points, center]);

  useEffect(() => {
    if (!map.current) return;
    if (picked) {
      if (!pickMarker.current) pickMarker.current = L.circleMarker([picked.lat, picked.lng], { radius: 9, color: "#fff", weight: 3, fillColor: "#0b5d4f", fillOpacity: 1 }).addTo(map.current);
      else pickMarker.current.setLatLng([picked.lat, picked.lng]);
      map.current.panTo([picked.lat, picked.lng]);
    }
  }, [picked]);

  return <div ref={el} role="application" aria-label={label} className={`w-full overflow-hidden rounded-[var(--radius-control)] border border-ink-200 bg-ink-100 ${className}`} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
