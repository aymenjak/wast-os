"use client";
import { CreditCard } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { useI18n } from "@/components/i18n-provider";
import { payOnlineAction } from "@/app/actions/support";

export function PayOnline({ invoiceId, size = "md" }: { invoiceId: string; size?: "sm" | "md" }) {
  const { t } = useI18n();
  return (
    <ActionForm action={payOnlineAction} hidden={{ invoiceId }}>
      <SubmitButton size={size}><CreditCard aria-hidden className="size-4" />{t("payOnline.button")}</SubmitButton>
    </ActionForm>
  );
}
