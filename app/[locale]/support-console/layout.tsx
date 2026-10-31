import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { Logo } from "@/components/ui/misc";
import { LanguageSwitcher } from "@/components/language-switcher";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** NEXVO staff only. Non-staff get a 404 so the console's existence is not revealed. */
export default async function ConsoleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const s = await requireUser(locale);
  if (!s.user.isPlatformStaff) notFound();
  const d = getDictionary(locale);
  return (
    <div className="min-h-dvh">
      <header className="bg-ink-900">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 text-white">
          <Link href={`/${locale}/support-console`}><Logo inverted /></Link>
          <span className="text-sm text-[#c9d3d1]">{d.support.consoleTitle}</span>
          {s.user.platformRole === "OWNER" || s.user.platformRole === "ADMIN" ? <Link href={`/${locale}/platform`} className="text-sm text-[#c9d3d1] hover:text-white">{d.nav.platform}</Link> : null}
          <div className="ms-auto [&_a]:text-[#c9d3d1] [&_a[aria-current]]:text-white"><LanguageSwitcher /></div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
