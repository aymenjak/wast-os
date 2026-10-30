/**
 * Route planning behind a provider interface. The default provider orders stops with a
 * nearest-neighbour heuristic on great-circle distance — a planning aid, not road routing.
 * A road-network provider (self-hosted OSRM/Valhalla or a commercial API) can replace it.
 */
export type Stop = { id: string; lat: number; lng: number };
export type PlannedRoute = { order: string[]; distanceKm: number; unlocated: string[] };

export interface RoutingProvider {
  readonly name: string;
  plan(depot: { lat: number; lng: number } | null, stops: (Stop | { id: string; lat: null; lng: null })[]): Promise<PlannedRoute>;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export const straightLineRouting: RoutingProvider = {
  name: "straight-line-nearest-neighbour",
  async plan(depot, stops) {
    const located = stops.filter((s): s is Stop => s.lat != null && s.lng != null);
    const unlocated = stops.filter((s) => s.lat == null || s.lng == null).map((s) => s.id);
    const remaining = [...located];
    const order: string[] = [];
    let distanceKm = 0;
    let current = depot ?? remaining[0] ?? null;
    while (remaining.length && current) {
      let best = 0;
      for (let i = 1; i < remaining.length; i++) {
        if (haversineKm(current, remaining[i]!) < haversineKm(current, remaining[best]!)) best = i;
      }
      const next = remaining.splice(best, 1)[0]!;
      distanceKm += haversineKm(current, next);
      order.push(next.id);
      current = next;
    }
    return { order, distanceKm: Math.round(distanceKm * 10) / 10, unlocated };
  },
};
