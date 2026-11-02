import { NextResponse } from "next/server";
import { currentSession } from "@/server/auth/session";
import { vehiclePositions } from "@/server/services/iot";
import { DomainError } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

/** Latest vehicle GPS fixes for the live operations map (session + fleet.read, tenant-scoped). */
export async function GET() {
  const s = await currentSession();
  if (!s?.ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ vehicles: await vehiclePositions(s.ctx) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof DomainError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    throw e;
  }
}
