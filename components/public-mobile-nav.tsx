"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export function PublicMobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <div className="ms-auto md:hidden">
      <button type="button" aria-expanded={open} aria-controls="public-mobile-menu" onClick={() => setOpen((o) => !o)} className="rounded-md p-2 text-ink-700 hover:bg-ink-100">
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        <span className="sr-only">{open ? t("common.close") : t("common.menu")}</span>
      </button>
      {open ? (
        <div id="public-mobile-menu" className="absolute inset-x-0 top-16 border-b border-ink-100 bg-white px-4 pb-4 shadow-[var(--shadow-pop)]">
          <ul className="flex flex-col py-2">
            {links.map((l) => (
              <li key={l.href}><Link onClick={() => setOpen(false)} href={l.href} className="block rounded-md px-2 py-2.5 text-ink-800 hover:bg-ink-50">{l.label}</Link></li>
            ))}
          </ul>
          <LanguageSwitcher />
        </div>
      ) : null}
    </div>
  );
}
