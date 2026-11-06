import { runAsTenant } from "@/server/tenant-scope";
import { NextResponse } from "next/server";
import { currentSession } from "@/server/auth/session";
import { getEvidenceForDownload } from "@/server/services/work-orders";
import { storage } from "@/server/storage";
import { DomainError } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

/** Serves evidence only to authorized members. Never cached publicly; PDFs are forced to download. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await currentSession();
  if (!s?.ctx) return new NextResponse("Not found", { status: 404 });
  try {
    const ev = await runAsTenant(s.ctx.org.id, () => getEvidenceForDownload(s.ctx!, id));
    const bytes = await storage().get(ev.storageKey);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": ev.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
        "Content-Disposition": `${ev.mimeType === "application/pdf" ? "attachment" : "inline"}; filename="${encodeURIComponent(ev.originalName)}"`,
      },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Not found", { status: 404 });
    throw e;
  }
}
