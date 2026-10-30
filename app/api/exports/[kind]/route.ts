import { NextResponse } from "next/server";
import { currentSession } from "@/server/auth/session";
import { exportInvoicesCsv, exportWorkOrdersCsv } from "@/server/services/reports";
import { DomainError } from "@/server/domain/errors";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const s = await currentSession();
  if (!s?.ctx) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return new NextResponse("Bad request", { status: 400 });
  try {
    const csv = kind === "work-orders" ? await exportWorkOrdersCsv(s.ctx, from, to) : kind === "invoices" ? await exportInvoicesCsv(s.ctx, from, to) : null;
    if (csv === null) return new NextResponse("Not found", { status: 404 });
    await audit(prisma, { organizationId: s.ctx.org.id, actorUserId: s.ctx.userId, action: "export.downloaded", entityType: "Export", entityId: kind, data: { from, to } });
    return new NextResponse("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nexvo-${kind}-${from}-${to}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Forbidden", { status: 403 });
    throw e;
  }
}
