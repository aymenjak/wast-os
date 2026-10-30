import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";

/** Adds the locale prefix to un-prefixed paths, preferring the saved choice, then Accept-Language. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  if ((LOCALES as readonly string[]).includes(first ?? "")) return NextResponse.next();

  const saved = request.cookies.get("nexvo_locale")?.value;
  const accept = request.headers.get("accept-language") ?? "";
  const negotiated =
    (saved && (LOCALES as readonly string[]).includes(saved) && saved) ||
    LOCALES.find((l) => accept.toLowerCase().split(",").some((p) => p.trim().startsWith(l))) ||
    DEFAULT_LOCALE;
  return NextResponse.redirect(new URL(`/${negotiated}${pathname === "/" ? "" : pathname}${search}`, request.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
