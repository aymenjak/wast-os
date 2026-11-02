import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authenticateIntegration, ingestLorawan } from "@/server/services/iot";
import { rateLimit } from "@/server/rate-limit";
import { DomainError } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

const PROVIDERS = { chirpstack: "CHIRPSTACK", ttn: "TTN" } as const;

/**
 * LoRaWAN network-server webhooks.
 *  ChirpStack v4 HTTP integration → POST /api/iot/v1/lorawan/chirpstack  (encoding: JSON; header Authorization: Bearer nxi_…)
 *  The Things Stack webhook       → POST /api/iot/v1/lorawan/ttn          (format: JSON; header Authorization: Bearer nxi_…; enable "Uplink message")
 * Unknown devices and non-uplink events are acknowledged with 202 so the network server does not retry them forever.
 */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const p = PROVIDERS[provider as keyof typeof PROVIDERS];
  if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (Number(req.headers.get("content-length") ?? 0) > 256_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  const integration = await authenticateIntegration(req.headers.get("authorization"), p);
  if (!integration) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimit(`lora:${integration.id}`, 20_000, 60 * 60_000)).ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (!(req.headers.get("content-type") ?? "").includes("json")) return NextResponse.json({ error: "json_required", hint: "Select JSON encoding in the network server integration." }, { status: 415 });
  const raw = await req.text();
  if (raw.length > 256_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  try {
    const r = await ingestLorawan(integration, JSON.parse(raw), new URL(req.url).searchParams.get("event"));
    return NextResponse.json({ ok: true, ...r }, { status: r.outcome === "ingested" ? 200 : 202 });
  } catch (e) {
    if (e instanceof SyntaxError || e instanceof ZodError) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    if (e instanceof DomainError) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    console.error("[lorawan] ingest failed", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
