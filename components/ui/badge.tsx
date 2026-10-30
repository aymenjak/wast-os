import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type Tone = "neutral" | "brand" | "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  info: "bg-info-100 text-info-700 ring-info-100",
  success: "bg-success-100 text-success-700 ring-success-100",
  warning: "bg-warning-100 text-warning-700 ring-warning-100",
  danger: "bg-danger-100 text-danger-700 ring-danger-100",
};

const dots: Record<Tone, string> = {
  neutral: "bg-ink-400",
  brand: "bg-brand-600",
  info: "bg-info-700",
  success: "bg-success-700",
  warning: "bg-warning-700",
  danger: "bg-danger-700",
};

/** Status is conveyed by text + shape (dot), never by colour alone. */
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dots[tone])} />
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  // work orders
  PLANNED: "neutral", ASSIGNED: "info", IN_PROGRESS: "brand", COMPLETED: "success", FAILED: "danger", CANCELLED: "neutral", DISPUTED: "warning",
  // requests
  SUBMITTED: "warning", VALIDATED: "info", REJECTED: "neutral", SCHEDULED: "info",
  // contracts
  DRAFT: "neutral", ACTIVE: "success", SUSPENDED: "warning", EXPIRED: "neutral", TERMINATED: "neutral",
  // invoices
  ISSUED: "info", PARTIALLY_PAID: "warning", PAID: "success", VOID: "neutral",
  // vehicles
  AVAILABLE: "success", IN_SERVICE: "brand", MAINTENANCE: "warning", RETIRED: "neutral",
  // civic
  UNDER_REVIEW: "warning", VERIFIED: "info", RESOLVED: "success", CONFIRMED: "success", DUPLICATE: "neutral", REOPENED: "danger",
  // priority
  LOW: "neutral", NORMAL: "neutral", HIGH: "warning", URGENT: "danger",
  TRIAL: "brand", PAST_DUE: "danger", RECORDED: "success", REVERSED: "neutral",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{label}</Badge>;
}
