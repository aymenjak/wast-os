import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { prisma } from "@/server/db";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { currentSession, requireOrg } from "@/server/auth/session";
import { listUserOrganizations } from "@/server/services/accounts";
import { buildNav } from "@/server/navigation";
import { SidebarNav, MobileNav } from "@/components/app-nav";
import { Logo } from "@/components/ui/misc";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CommandPalette } from "@/components/command-palette";
import { switchOrgAction } from "@/app/actions/public";
import { endSupportSessionAction } from "@/app/actions/support";
import { formatDateTime } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const ctx = await requireOrg(locale);
  if (ctx.role === "CUSTOMER_PORTAL") redirect(`/${locale}/portal`);
  const d = getDictionary(locale);
  const session = await currentSession();
  const orgs = session ? await listUserOrganizations(session.user.id) : [];
  const nav = buildNav(ctx, d, locale);
  // Owners/admins are warned about unpaid NEXVO invoices before any suspension.
  const pastDue = ctx.permissions.has("settings.manage") && !ctx.support
    ? (await prisma.subscription.findUnique({ where: { organizationId: ctx.org.id }, select: { status: true } }))?.status === "PAST_DUE"
    : false;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden bg-ink-900 lg:block print:hidden">
        <div className="sticky top-0 flex h-dvh flex-col">
        <div className="flex h-14 items-center px-5">
          <Link href={`/${locale}/app`} aria-label="Nexvo"><Logo inverted /></Link>
        </div>
        <div className="flex-1 overflow-y-auto"><SidebarNav sections={nav} /></div>
        <div className="border-t border-white/10 px-5 py-3 text-xs text-[#9fb0ad]">
          <div className="truncate font-medium text-white">{ctx.org.name}</div>
          <div>{d.enums.OrgRole[ctx.role]}</div>
        </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-200 bg-ink-50 px-4 sm:px-6 print:hidden">
          <MobileNav sections={nav} />
          <div className="lg:hidden"><Logo withWordmark={false} /></div>
          {orgs.length > 1 ? (
            <form action={switchOrgAction} className="flex items-center gap-2">
              <input type="hidden" name="locale" value={locale} />
              <label htmlFor="org-switch" className="sr-only">{d.nav.switchOrg}</label>
              <select id="org-switch" name="organizationId" defaultValue={ctx.org.id} className="h-8 max-w-48 rounded-md border border-ink-200 bg-white px-2 text-sm">
                {orgs.map((m) => <option key={m.organizationId} value={m.organizationId}>{m.organization.name}</option>)}
              </select>
              <button type="submit" className="text-xs font-medium text-brand-700 hover:underline">{d.common.apply}</button>
            </form>
          ) : (
            <span className="truncate text-sm font-medium text-ink-800 lg:hidden">{ctx.org.name}</span>
          )}
          <div className="hidden flex-1 md:flex"><CommandPalette /></div>
          <div className="ms-auto flex items-center gap-4">
            <LanguageSwitcher className="hidden sm:flex" />
            {(session?.user.platformRole === "OWNER" || session?.user.platformRole === "ADMIN") && !ctx.support ? <Link href={`/${locale}/platform`} className="hidden text-sm font-medium text-ink-800 hover:underline md:inline">{d.nav.platform}</Link> : null}
            {session?.user.isPlatformStaff && !ctx.support ? <Link href={`/${locale}/support-console`} className="hidden text-sm font-medium text-ink-800 hover:underline md:inline">{d.nav.supportConsole}</Link> : null}
            {ctx.support ? <span className="hidden text-sm text-ink-700 md:inline">{ctx.userName}</span> : <Link href={`/${locale}/account/security`} className="hidden text-sm text-ink-700 hover:underline md:inline" title={d.mfa.title}>{ctx.userName}</Link>}
            <LogoutButton locale={locale} label={d.common.signOut} />
          </div>
        </header>
        {ctx.support ? (
          <div role="status" className="flex flex-wrap items-center justify-between gap-3 bg-hivis-600 px-4 py-2 text-sm font-medium text-ink-950 sm:px-6">
            <span>{d.support.banner.replace("{time}", formatDateTime(ctx.support.expiresAt, locale, ctx.org.timezone))}</span>
            <form action={endSupportSessionAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="rounded bg-ink-950 px-3 py-1 text-white">{d.support.endSession}</button>
            </form>
          </div>
        ) : null}
        {pastDue ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 bg-danger-100 px-4 py-2 text-sm text-danger-700 print:hidden">
            <span>{d.billing.pastDueBanner}</span>
            <Link href={`/${locale}/app/billing`} className="font-semibold underline">{d.billing.payNow}</Link>
          </div>
        ) : null}
        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
