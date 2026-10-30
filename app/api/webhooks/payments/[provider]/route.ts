import { NextResponse } from "next/server";
import { processPaymentWebhook } from "@/server/services/invoices";
import { DomainError } from "@/server/domain/errors";

export const dynamic = "force-dynamic";

/**
 * Generic signed payment notification endpoint (HMAC-SHA256 of the raw body in X-Nexvo-Signature).
 * A provider-specific adapter (e.g. a CIB/Edahabia gateway) must translate and verify the provider's
 * own signature scheme before calling processPaymentWebhook. No provider is integrated yet.
 */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!/^[a-z0-9-]{2,32}$/.test(provider)) return new NextResponse("Not found", { status: 404 });
  const raw = await req.text();
  if (raw.length > 64_000) return new NextResponse("Payload too large", { status: 413 });
  try {
    const r = await processPaymentWebhook(provider, raw, req.headers.get("x-nexvo-signature"), process.env.PAYMENT_WEBHOOK_SECRET);
    return NextResponse.json({ ok: true, duplicate: r.duplicate });
  } catch (e) {
    if (e instanceof DomainError) {
      const status = e.code === "errors.forbidden" ? 401 : 422;
      return NextResponse.json({ ok: false, error: e.code }, { status });
    }
    console.error("[webhook] failed", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
