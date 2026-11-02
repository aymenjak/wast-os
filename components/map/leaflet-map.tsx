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

export type MapPoint = { id: string; lat: number; lng: number; color: string; label: string; href?: string; order?: number };
export type MapRoute = { id: string; color: string; points: [number, number][] };
/** Live vehicle (GPS tracker). `stale` = last fix older than 15 minutes. */
export type MapVehicle = { id: string; lat: number; lng: number; label: string; stale: boolean; href?: string };

const ALGIERS: [number, number] = [36.7538, 3.0588];

export default function LeafletMap({
  points = [],
  routes = [],
  vehicles = [],
  picked,
  onPick,
  center,
  zoom = 12,
  className = "h-80",
  label,
}: {
  points?: MapPoint[];
  routes?: MapRoute[];
  vehicles?: MapVehicle[];
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
  const vehicleLayer = useRef<L.LayerGroup | null>(null);
  const pickMarker = useRef<L.CircleMarker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!el.current || map.current) return;
    const start = center ?? (points[0] ? { lat: points[0].lat, lng: points[0].lng } : { lat: ALGIERS[0], lng: ALGIERS[1] });
    const m = L.map(el.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], zoom);
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    vehicleLayer.current = L.layerGroup().addTo(m);
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
    for (const r of routes) {
      if (r.points.length < 2) continue;
      L.polyline(r.points, { color: "#ffffff", weight: 7, opacity: 0.9 }).addTo(g);
      L.polyline(r.points, { color: r.color, weight: 4, opacity: 1, lineJoin: "round" }).addTo(g);
    }
    for (const p of points) {
      const mk = p.order != null
        ? L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", iconSize: [22, 22], html: `<span style="display:flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:999px;background:${p.color};color:#fff;font:700 11px/1 system-ui;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)">${p.order}</span>` }) })
        : L.circleMarker([p.lat, p.lng], { radius: 7, color: "#fff", weight: 2, fillColor: p.color, fillOpacity: 0.95 });
      const content = p.href ? `<a href="${encodeURI(p.href)}">${escapeHtml(p.label)}</a>` : escapeHtml(p.label);
      mk.bindTooltip(content).bindPopup(content);
      mk.addTo(g);
    }
    if (points.length > 1 && !center) map.current.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [24, 24], maxZoom: 15 });
  }, [points, routes, center]);

  // Vehicles live on their own layer so polling updates never refit or reset the view.
  useEffect(() => {
    const g = vehicleLayer.current;
    if (!g) return;
    g.clearLayers();
    for (const v of vehicles) {
      const bg = v.stale ? "#5a6b65" : "#1d2a2e";
      const html = `<span style="display:flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:6px;background:${bg};border:2px solid ${v.stale ? "#ffffff" : "#e8590c"};box-shadow:0 1px 3px rgba(0,0,0,.35)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></span>`;
      const content = v.href ? `<a href="${encodeURI(v.href)}">${escapeHtml(v.label)}</a>` : escapeHtml(v.label);
      L.marker([v.lat, v.lng], { icon: L.divIcon({ className: "", iconSize: [26, 26], html }), zIndexOffset: 1000, keyboard: true, title: v.label }).bindTooltip(content).bindPopup(content).addTo(g);
    }
  }, [vehicles]);

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
