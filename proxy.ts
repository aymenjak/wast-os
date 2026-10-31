import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";

/** Map tile host allowed by CSP (configurable; see ARCHITECTURE.md → maps). */
function tileOrigin() {
  try {
    const u = new URL((process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png").replace(/\{[a-z]\}/g, "a"));
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://tile.openstreetmap.org";
  }
}

/**
 * Content-Security-Policy with a per-request nonce (Next.js 16 guide: content-security-policy).
 * Scripts: nonce + strict-dynamic only. Styles: 'unsafe-inline' is required for React `style`
 * attributes and Leaflet, which cannot carry a nonce.
 */
function csp(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const https = (process.env.APP_URL ?? "").startsWith("https://");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${tileOrigin()}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (!(LOCALES as readonly string[]).includes(first ?? "")) {
    const saved = request.cookies.get("nexvo_locale")?.value;
    const accept = request.headers.get("accept-language") ?? "";
    const negotiated =
      (saved && (LOCALES as readonly string[]).includes(saved) && saved) ||
      LOCALES.find((l) => accept.toLowerCase().split(",").some((p) => p.trim().startsWith(l))) ||
      DEFAULT_LOCALE;
    return NextResponse.redirect(new URL(`/${negotiated}${pathname === "/" ? "" : pathname}${search}`, request.url));
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = csp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: never redirect API routes, Next assets or public files (anything with a file extension, e.g. /showcase/*.jpg).
      source: "/((?!api|_next/static|_next/image|showcase/|favicon.ico|icon.svg|robots.txt|.*\\.(?:jpg|jpeg|png|webp|avif|svg|ico|txt|xml|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
