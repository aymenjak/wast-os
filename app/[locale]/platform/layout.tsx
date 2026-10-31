import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { requireUser } from "@/server/auth/session";
import { Logo } from "@/components/ui/misc";
import { LanguageSwitcher } from "@/components/language-switcher";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** Platform owner/admin console. Anyone else gets a 404 so the console's existence is not revealed. */
export default async function PlatformLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const s = await requireUser(locale);
  const role = s.user.disabledAt ? null : s.user.platformRole;
  if (role !== "OWNER" && role !== "ADMIN") notFound();
  const d = getDictionary(locale);
  const base = `/${locale}/platform`;
  const nav: [string, string][] = [
    [base, d.platform.nav.overview], [`${base}/tenants`, d.platform.nav.tenants], [`${base}/plans`, d.platform.nav.plans],
    [`${base}/staff`, d.platform.nav.staff], [`${base}/audit`, d.platform.nav.audit], [`/${locale}/support-console`, d.platform.nav.support],
  ];
  return (
    <div className="min-h-dvh">
      <header className="bg-ink-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href={base}><Logo inverted /></Link>
          <span className="rounded-sm bg-hivis-600 px-1.5 py-0.5 text-xs font-bold text-ink-950">{d.platform.title}</span>
          <span className="hidden text-sm text-[#c9d3d1] sm:inline"><bdi>{s.user.name}</bdi> · {d.platform.roles[role]}</span>
          <div className="ms-auto [&_a]:text-[#c9d3d1] [&_a[aria-current]]:text-white"><LanguageSwitcher /></div>
        </div>
        <nav aria-label={d.platform.title} className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {nav.map(([href, label]) => <Link key={href} href={href} className="shrink-0 rounded-md px-3 py-1.5 text-[#c9d3d1] hover:bg-ink-800 hover:text-white">{label}</Link>)}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
