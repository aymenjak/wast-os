import { NextResponse } from "next/server";
import { withFieldSession } from "@/server/http/field-guard";
import { applyFieldAction } from "@/server/services/field";

export const dynamic = "force-dynamic";

/** One queued action (start, weight, complete, fail) from the phone's outbox. Idempotent on its id. */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 32_000) return NextResponse.json({ error: "errors.validation" }, { status: 413 });
  return withFieldSession(req, async (ctx) => applyFieldAction(ctx, await req.json().catch(() => null)));
}
