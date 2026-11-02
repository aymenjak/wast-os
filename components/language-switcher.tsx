"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const rest = pathname.split("/").slice(2).join("/");
  return (
    <nav aria-label={t("common.language")} className={cn("flex items-center gap-1 text-sm", className)}>
      <Languages aria-hidden className="size-4 text-ink-500" />
      {LOCALES.map((l: Locale) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
          onClick={() => {
            document.cookie = `nexvo_locale=${l}; path=/; max-age=31536000; samesite=lax`;
          }}
          className={cn("rounded px-1.5 py-0.5", l === locale ? "font-semibold text-ink-950" : "text-ink-600 hover:text-ink-900")}
        >
          {LOCALE_NAMES[l]}
        </Link>
      ))}
    </nav>
  );
}
