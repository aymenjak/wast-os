"use client";
import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { generateScheduleAction } from "@/app/actions/business";

export function GenerateSchedule({ from, to }: { from: string; to: string }) {
  const { t } = useI18n();
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <ActionForm action={generateScheduleAction} hidden={{ from, to }} onResult={(s) => setResult(s.ok && s.data ? t("schedule.result", { created: s.data.created, skipped: s.data.skipped }) : null)}>
        <span title={t("schedule.generateHint")}>
          <SubmitButton size="sm"><CalendarClock aria-hidden className="size-4" />{t("schedule.generate")}</SubmitButton>
        </span>
      </ActionForm>
      {result ? <p role="status" className="text-xs text-ink-700" data-testid="schedule-result">{result}</p> : null}
    </div>
  );
}
