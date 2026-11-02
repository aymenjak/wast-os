import { NextResponse } from "next/server";
import { currentSession } from "@/server/auth/session";
import { platformInvoicePdf } from "@/server/documents/invoice-pdf";
import { pdfEnabled } from "@/server/pdf";
import { DomainError } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

/** PDF of a NEXVO subscription invoice, for the organization's owners/admins. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s?.ctx || !s.ctx.permissions.has("settings.manage") || s.ctx.support) return new NextResponse("Forbidden", { status: 403 });
  if (!pdfEnabled()) return new NextResponse("PDF not configured", { status: 501 });
  try {
    const { pdf, filename } = await platformInvoicePdf((await params).id, s.ctx.org.id);
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Not found", { status: 404 });
    throw e;
  }
}
