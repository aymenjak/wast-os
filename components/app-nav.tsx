"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, Building2, CalendarRange, ClipboardList, FileText, Gauge, Map, Menu, Receipt, Settings, ShieldCheck, Truck, Users, Wrench, X, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

const ICONS = { Gauge, Building2, FileText, ClipboardList, CalendarRange, Wrench, Truck, Receipt, BarChart3, Users, Settings, ShieldCheck, Map, Home } as const;
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };
export type NavSection = { title?: string; items: NavItem[] };

function NavList({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      {sections.map((s, i) => (
        <div key={i}>
          {s.title ? <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{s.title}</div> : null}
          <ul className="space-y-0.5">
            {s.items.map((it) => {
              const Icon = ICONS[it.icon];
              const active = pathname === it.href || (it.href.split("/").length > 3 && pathname.startsWith(it.href + "/"));
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                      active ? "bg-brand-50 font-medium text-brand-800" : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                    )}
                  >
                    <Icon aria-hidden className={cn("size-4", active ? "text-brand-700" : "text-ink-500")} />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("common.menu")} className="px-3 py-4">
      <NavList sections={sections} />
    </nav>
  );
}

export function MobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <div className="lg:hidden">
      <button type="button" aria-expanded={open} aria-controls="app-mobile-nav" onClick={() => setOpen((o) => !o)} className="rounded-md p-2 text-ink-700 hover:bg-ink-100">
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        <span className="sr-only">{open ? t("common.close") : t("common.menu")}</span>
      </button>
      {open ? (
        <div id="app-mobile-nav" className="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto border-t border-ink-200 bg-white px-3 py-4">
          <nav aria-label={t("common.menu")}><NavList sections={sections} onNavigate={() => setOpen(false)} /></nav>
          <LanguageSwitcher className="mt-6 border-t border-ink-100 px-3 pt-4" />
        </div>
      ) : null}
    </div>
  );
}
