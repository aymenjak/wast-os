import "../globals.css";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { dirOf, isLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n-provider";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);
  return {
    title: { default: d.meta.title, template: `%s, NEXVO` },
    description: d.meta.description,
    icons: { icon: "/icon.svg" },
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])) },
  };
}

export const viewport: Viewport = { themeColor: "#0b5d4f", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow-[var(--shadow-pop)]">
          {dict.common.skipToContent}
        </a>
        <I18nProvider dict={dict} locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
