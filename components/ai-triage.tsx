"use client";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { aiFeedbackAction, aiTriageAction } from "@/app/actions/ai";

type Suggestion = { id: string; category: string; priority: string; likelyDuplicate: boolean; rationale: string; publicNoteDraft: string };

/** Shows an AI triage suggestion to the reviewer. It never changes the report; the reviewer decides. */
export function AiTriage({ reportId }: { reportId: string }) {
  const { t, locale } = useI18n();
  const [s, setS] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(false);
  const [pending, start] = useTransition();
  return (
    <section className="rounded-[var(--radius-card)] border border-dashed border-ink-300 bg-white p-4" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink-900"><Sparkles aria-hidden className="size-4" />{t("ai.title")}</h3>
        {!s ? (
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await aiTriageAction(reportId, locale); if (r.ok) setS(r.suggestion); else setError(r.error); })}
            className="h-8 rounded-[var(--radius-control)] border border-ink-200 px-3 text-sm font-medium hover:bg-ink-50 disabled:opacity-60">
            {pending ? t("common.loading") : t("ai.suggest")}
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-danger-700">{t(error)}</p> : null}
      {s ? (
        <div className="mt-3 space-y-2 text-sm">
          <p><span className="text-ink-600">{t("civic.category")}: </span><strong>{t(`enums.CivicCategory.${s.category}`)}</strong>, <span className="text-ink-600">{t("requests.priority")}: </span><strong>{t(`enums.Priority.${s.priority}`)}</strong></p>
          {s.likelyDuplicate ? <p className="text-warning-700">{t("ai.likelyDuplicate")}</p> : null}
          <p><span className="text-ink-600">{t("ai.rationale")}: </span>{s.rationale}</p>
          <p><span className="text-ink-600">{t("ai.draftNote")}: </span>{s.publicNoteDraft}</p>
          <p className="text-xs text-ink-600">{t("ai.disclaimer")}</p>
          {feedback ? <p className="text-xs text-success-700">{t("ai.thanks")}</p> : (
            <div className="flex gap-2">
              {[true, false].map((ok) => (
                <button key={String(ok)} type="button" onClick={() => start(async () => { await aiFeedbackAction(s.id, ok, locale); setFeedback(true); })} className="h-7 rounded border border-ink-200 px-2 text-xs hover:bg-ink-50">
                  {ok ? t("ai.accept") : t("ai.dismiss")}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
