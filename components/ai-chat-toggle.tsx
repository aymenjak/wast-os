"use client";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { setAiChatAction } from "@/app/actions/ai";

export function AiChatToggle({ enabled }: { enabled: boolean }) {
  const { t } = useI18n();
  return (
    <ActionForm action={setAiChatAction} hidden={{ enabled: String(!enabled) }}>
      <SubmitButton variant={enabled ? "danger" : "secondary"} size="sm">{enabled ? t("assistant.disable") : t("assistant.enable")}</SubmitButton>
    </ActionForm>
  );
}
