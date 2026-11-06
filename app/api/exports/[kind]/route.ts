import { runAsTenant } from "@/server/tenant-scope";
import { NextResponse } from "next/server";
import { currentSession } from "@/server/auth/session";
import { buildExport, EXPORT_KINDS, tableToCsv, tableToXlsx, type ExportKind } from "@/server/exports";
import { DomainError } from "@/server/domain/errors";
import { audit } from "@/server/audit";
import { prisma } from "@/server/db";
import { isLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

/** CSV (UTF-8 BOM, formula-safe) or XLSX (RTL for Arabic) exports. Session + permission checked; audited. */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const s = await currentSession();
  if (!s?.ctx) return new NextResponse("Unauthorized", { status: 401 });
  // Support staff may look, not bulk-extract customer data.
  if (s.ctx.support) return new NextResponse("Forbidden", { status: 403 });
  if (!(EXPORT_KINDS as readonly string[]).includes(kind)) return new NextResponse("Not found", { status: 404 });
  const url = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const from = url.searchParams.get("from") ?? "2000-01-01";
  const to = url.searchParams.get("to") ?? today;
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const l = url.searchParams.get("locale");
  const locale = isLocale(l) ? l : "fr";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return new NextResponse("Bad request", { status: 400 });
  try {
    const table = await runAsTenant(s.ctx.org.id, () => buildExport(s.ctx!, kind as ExportKind, from, to, locale));
    await audit(prisma, { organizationId: s.ctx.org.id, actorUserId: s.ctx.userId, action: "export.downloaded", entityType: "Export", entityId: kind, data: { from, to, format } });
    const name = `nexvo-${kind}-${from}-${to}`;
    if (format === "xlsx") {
      const buf = await tableToXlsx(table, kind, locale);
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${name}.xlsx"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return new NextResponse("﻿" + tableToCsv(table), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof DomainError) return new NextResponse("Forbidden", { status: 403 });
    throw e;
  }
}
