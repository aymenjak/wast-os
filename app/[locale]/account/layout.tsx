import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/server/auth/session";
import { Logo } from "@/components/ui/misc";
import { LanguageSwitcher } from "@/components/language-switcher";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const s = await requireUser(locale);
  const d = getDictionary(locale);
  const back = s.ctx ? (s.ctx.role === "CUSTOMER_PORTAL" ? `/${locale}/portal` : `/${locale}/app`) : s.user.platformRole === "SUPPORT" ? `/${locale}/support-console` : s.user.platformRole ? `/${locale}/platform` : `/${locale}`;
  return (
    <div className="min-h-dvh">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <Link href={back}><Logo /></Link>
          <Link href={back} className="text-sm text-ink-700 hover:underline">{d.mfa.back}</Link>
          <div className="ms-auto"><LanguageSwitcher /></div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
