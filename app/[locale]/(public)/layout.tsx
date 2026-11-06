import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PublicMobileNav } from "@/components/public-mobile-nav";
import { workspaceHref } from "@/server/auth/session";

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const home = await workspaceHref(locale);
  const links = [
    { href: `/${locale}/business`, label: d.nav.business },
    { href: `/${locale}/civic`, label: d.nav.civic },
    { href: `/${locale}/pricing`, label: d.nav.pricing },
    { href: `/${locale}/about`, label: d.nav.about },
  ];
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-50/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href={`/${locale}`} aria-label="Nexvo" className="shrink-0">
            <Logo />
          </Link>
          <nav aria-label={d.nav.product} className="hidden items-center gap-5 text-sm text-ink-700 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-ink-950">{l.label}</Link>
            ))}
          </nav>
          <div className="ms-auto hidden items-center gap-3 md:flex">
            <LanguageSwitcher />
            {home ? <ButtonLink href={home} size="sm" prefetch={false}>{d.nav.myWorkspace}</ButtonLink> : <>
              <Link href={`/${locale}/login`} className="text-sm font-medium text-ink-800 hover:text-ink-950">{d.nav.signIn}</Link>
              <ButtonLink href={`/${locale}/register`} size="sm">{d.nav.startTrial}</ButtonLink>
            </>}
          </div>
          <PublicMobileNav links={[...links, ...(home ? [{ href: home, label: d.nav.myWorkspace }] : [{ href: `/${locale}/login`, label: d.nav.signIn }, { href: `/${locale}/register`, label: d.nav.startTrial }])]} />
        </div>
      </header>
      <main id="main" className="flex-1">{children}</main>
      <footer className="bg-ink-900 text-[#c9d3d1]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 text-sm sm:grid-cols-3 sm:px-6 [&_a:hover]:text-white [&_nav_a]:text-[#c9d3d1] [&_nav_a[aria-current]]:text-white [&_svg]:text-[#9fb0ad]">
          <div className="space-y-2">
            <Logo inverted />
            <p>{d.footer.tagline}</p>
          </div>
          <ul className="space-y-1.5">
            <li><Link className="hover:text-white" href={`/${locale}/civic/report`}>{d.nav.reportProblem}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/civic/track`}>{d.nav.trackReport}</Link></li>
            <li><Link className="hover:text-white" href={`/${locale}/pricing`}>{d.nav.pricing}</Link></li>
          </ul>
          <div className="space-y-2">
            <p>{d.footer.privacy}</p>
            <p>{d.footer.rights.replace("{year}", String(new Date().getFullYear()))}</p>
            <LanguageSwitcher />
          </div>
        </div>
      </footer>
    </div>
  );
}
