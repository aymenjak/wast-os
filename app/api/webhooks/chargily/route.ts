import { NextResponse } from "next/server";
import { handleChargilyWebhook } from "@/server/payments/chargily";
import { DomainError } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

/** Chargily Pay webhook. Reads the raw body (the signature covers the exact bytes). */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 64_000) return new NextResponse("Payload too large", { status: 413 });
  const raw = await req.text();
  if (raw.length > 64_000) return new NextResponse("Payload too large", { status: 413 });
  try {
    const r = await handleChargilyWebhook(raw, req.headers.get("signature"));
    return NextResponse.json({ ok: true, outcome: r.outcome });
  } catch (e) {
    if (e instanceof DomainError) return NextResponse.json({ ok: false }, { status: e.code === "errors.forbidden" ? 403 : 422 });
    if (e instanceof SyntaxError || (e as { name?: string }).name === "ZodError") return NextResponse.json({ ok: false }, { status: 400 });
    console.error("[chargily] webhook failed", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
