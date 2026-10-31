"use client";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { aiBriefAction } from "@/app/actions/ai";

export function AiBrief() {
  const { t, locale } = useI18n();
  const [brief, setBrief] = useState<{ headline: string; points: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-[var(--radius-card)] border border-ink-200 bg-white px-5 py-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink-900">{t("ai.briefTitle")}</h2>
        <button type="button" disabled={pending} onClick={() => start(async () => { const r = await aiBriefAction(locale); if (r.ok) { setBrief(r.brief); setError(null); } else setError(r.error); })}
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-control)] border border-ink-200 bg-white px-3 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-60">
          <Sparkles aria-hidden className="size-4" />{pending ? t("common.loading") : t("ai.briefGenerate")}
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-danger-700">{t(error)}</p> : null}
      {brief ? (
        <div className="mt-3">
          <p className="font-semibold text-ink-900">{brief.headline}</p>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-ink-800">{brief.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
          <p className="mt-3 text-xs text-ink-600">{t("ai.briefNote")}</p>
        </div>
      ) : null}
    </section>
  );
}
