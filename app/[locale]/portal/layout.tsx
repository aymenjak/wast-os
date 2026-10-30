import { notFound, redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { requireOrg } from "@/server/auth/session";
import { Logo } from "@/components/ui/misc";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logoutAction } from "@/app/actions/public";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const ctx = await requireOrg(locale);
  if (ctx.role !== "CUSTOMER_PORTAL") redirect(`/${locale}/app`);
  const d = getDictionary(locale);
  return (
    <div className="min-h-dvh">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Logo />
          <span className="hidden text-sm text-ink-600 sm:inline">· {ctx.org.name}</span>
          <div className="ms-auto flex items-center gap-4">
            <LanguageSwitcher className="hidden sm:flex" />
            <form action={logoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button className="inline-flex items-center gap-1.5 text-sm text-ink-700 hover:text-ink-950"><LogOut aria-hidden className="size-4 rtl:rotate-180" />{d.common.signOut}</button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
