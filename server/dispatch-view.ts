import "server-only";
import { dispatchBoard } from "./services/work-orders";
import { straightLineRouting } from "./routing";
import type { OrgContext } from "./context";

/** Distinct, print-safe team colours; the first is the brand's hi-vis route colour. */
export const TEAM_COLORS = ["#e8590c", "#1f5a44", "#1d4ed8", "#7c3aed", "#0e7490", "#a16207", "#be185d"];

type Board = Awaited<ReturnType<typeof dispatchBoard>>;
export type BoardOrder = Board["orders"][number];

export function stopOf(o: BoardOrder) {
  const lat = o.serviceLocation?.latitude ?? o.civicReport?.latitude;
  const lng = o.serviceLocation?.longitude ?? o.civicReport?.longitude;
  return lat != null && lng != null ? { id: o.id, lat: Number(lat), lng: Number(lng) } : { id: o.id, lat: null, lng: null };
}

/** Board for a day with each team's stops in suggested order. */
export async function dispatchView(ctx: OrgContext, date: string) {
  const board = await dispatchBoard(ctx, date);
  const open = board.orders.filter((o) => o.status !== "CANCELLED");
  const teams = await Promise.all(
    board.teams.map(async (team, i) => {
      const list = open.filter((o) => o.teamId === team.id);
      const plan = await straightLineRouting.plan(null, list.map(stopOf));
      const ordered = [...plan.order, ...plan.unlocated].map((id) => list.find((o) => o.id === id)!);
      return { team, color: TEAM_COLORS[i % TEAM_COLORS.length]!, orders: ordered, km: plan.distanceKm };
    }),
  );
  return { ...board, open, unassigned: open.filter((o) => !o.teamId), teamRoutes: teams };
}
