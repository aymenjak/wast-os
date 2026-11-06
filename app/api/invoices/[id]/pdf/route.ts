import { runAsTenant } from "@/server/tenant-scope";
import { NextResponse } from "next/server";
import { currentSession } from "@/server/auth/session";
import { tenantInvoicePdf } from "@/server/documents/invoice-pdf";
import { pdfEnabled } from "@/server/pdf";
import { DomainError } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

/** PDF of an issued invoice (staff with invoices.read, or the customer through the portal). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s?.ctx) return new NextResponse("Unauthorized", { status: 401 });
  if (!pdfEnabled()) return new NextResponse("PDF not configured", { status: 501 });
  try {
    const { pdf, filename } = await runAsTenant(s.ctx.org.id, async () => tenantInvoicePdf(s.ctx!, (await params).id));
    return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Not found", { status: 404 });
    throw e;
  }
}
