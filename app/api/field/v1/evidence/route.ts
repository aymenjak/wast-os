import { NextResponse } from "next/server";
import { withFieldSession } from "@/server/http/field-guard";
import { applyFieldEvidence } from "@/server/services/field";
import { DomainError } from "@/server/domain/errors";
import { MAX_UPLOAD_BYTES } from "@/server/storage";

export const dynamic = "force-dynamic";

/** A photo taken offline (multipart: workOrderId, kind, clientRef, file). Same checks as the online upload. */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64_000) return NextResponse.json({ error: "errors.upload.tooLarge" }, { status: 413 });
  return withFieldSession(req, async (ctx) => {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!form || !(file instanceof File)) throw new DomainError("errors.validation", { fields: { file: "required" } });
    return applyFieldEvidence(ctx, String(form.get("workOrderId") ?? ""), String(form.get("kind") ?? ""), String(form.get("clientRef") ?? ""), {
      name: file.name || "photo.jpg",
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  });
}
