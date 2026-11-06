"use client";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { Illustration } from "@/components/illustrations";

/** Safety net inside the app: an unexpected error keeps the menu and offers retry / back, never a bare error screen. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dict: d, locale } = useI18n();
  return (
    <main id="main" className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <Illustration name="notFound" className="w-48" />
      <h1 className="text-lg font-semibold text-ink-900">{d.errors.generic}</h1>
      {error.digest ? <p className="num text-xs text-ink-500">ref. {error.digest}</p> : null}
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => reset()} className="inline-flex h-10 items-center rounded-[var(--radius-control)] bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800">{d.common.retry}</button>
        <Link prefetch={false} href={`/${locale}/app`} className="inline-flex h-10 items-center rounded-[var(--radius-control)] border border-ink-200 bg-white px-4 text-sm font-medium text-ink-900 hover:bg-ink-50">{d.nav.myWorkspace}</Link>
      </div>
    </main>
  );
}
