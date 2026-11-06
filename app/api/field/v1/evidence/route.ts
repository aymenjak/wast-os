import { NextResponse } from "next/server";
import { withFieldSession } from "@/server/http/field-guard";
import { applyFieldEvidence, applyFieldSignature } from "@/server/services/field";
import { DomainError } from "@/server/domain/errors";
import { MAX_UPLOAD_BYTES } from "@/server/storage";

export const dynamic = "force-dynamic";

/**
 * A photo taken offline (multipart: workOrderId, kind, clientRef, file), or the customer's signature on the collection
 * slip (kind SIGNATURE, plus signerName and signedAt). Same checks as the online pages.
 */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64_000) return NextResponse.json({ error: "errors.upload.tooLarge" }, { status: 413 });
  return withFieldSession(req, async (ctx) => {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!form || !(file instanceof File)) throw new DomainError("errors.validation", { fields: { file: "required" } });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (form.get("kind") === "SIGNATURE") {
      return applyFieldSignature(ctx, String(form.get("workOrderId") ?? ""), String(form.get("clientRef") ?? ""), String(form.get("signerName") ?? ""), String(form.get("signedAt") ?? ""), { name: "signature.png", bytes });
    }
    return applyFieldEvidence(ctx, String(form.get("workOrderId") ?? ""), String(form.get("kind") ?? ""), String(form.get("clientRef") ?? ""), {
      name: file.name || "photo.jpg",
      bytes,
    });
  });
}
