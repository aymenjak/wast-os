import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticateDevice, ingest } from "@/server/services/iot";
import { rateLimit } from "@/server/rate-limit";
import { DomainError } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

/**
 * Device ingestion. `Authorization: Bearer nxd_…` (per-device key).
 * Body: {"readings":[{"measuredAt":"2026-11-01T08:00:00Z","fillPct":72,"batteryPct":88,"temperatureC":21.5}]}
 *   or  {"positions":[{"recordedAt":"…","lat":35.7,"lng":-0.63,"speedKmh":32,"heading":180}]}
 * Up to 100 items per request; resending the same timestamps is harmless.
 */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 256_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const device = await authenticateDevice(req.headers.get("authorization"));
  if (!device) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimit(`iot:${device.id}`, 1200, 60 * 60_000)).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const raw = await req.text();
  if (raw.length > 256_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  try {
    return NextResponse.json({ ok: true, ...(await ingest(device, JSON.parse(raw))) });
  } catch (e) {
    if (e instanceof SyntaxError || e instanceof ZodError) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    if (e instanceof DomainError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[iot] ingest failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
