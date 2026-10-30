"use client";
import type { ReactNode } from "react";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/actions/state";

type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;

/** One-button server action (status changes etc.). Errors render inline next to the button. */
export function InlineAction({ action, hidden, label, variant = "secondary", size = "sm" }: { action: Action; hidden: Record<string, string>; label: ReactNode; variant?: "primary" | "secondary" | "danger" | "subtle"; size?: "sm" | "md" }) {
  return (
    <ActionForm action={action} hidden={hidden} className="inline-block">
      <SubmitButton variant={variant} size={size}>{label}</SubmitButton>
    </ActionForm>
  );
}

/** Disclosure that reveals a form; native <details> keeps it keyboard- and screen-reader-friendly. */
export function Disclosure({ summary, children, defaultOpen }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-[var(--radius-control)] border border-ink-200 bg-white open:shadow-[var(--shadow-card)]" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50 [&::-webkit-details-marker]:hidden">
        <span className="me-1 inline-block transition-transform group-open:rotate-90 rtl:group-open:-rotate-90">›</span>
        {summary}
      </summary>
      <div className="border-t border-ink-100 p-4">{children}</div>
    </details>
  );
}
