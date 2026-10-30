import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Inbox, ShieldAlert } from "lucide-react";

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-500">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Inbox aria-hidden className="size-6 text-ink-500" />
      <p className="text-sm font-medium text-ink-800">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-ink-600">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Forbidden({ message }: { message: string }) {
  return (
    <div role="alert" className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 text-center">
      <ShieldAlert aria-hidden className="size-8 text-ink-500" />
      <p className="text-sm text-ink-700">{message}</p>
    </div>
  );
}

export function Stat({ label, value, sub, tone = "default" }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "default" | "warning" | "danger" }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white px-4 py-3.5 shadow-[var(--shadow-card)]">
      <div className="text-xs font-medium text-ink-600">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums tracking-tight", tone === "danger" ? "text-danger-700" : tone === "warning" ? "text-warning-700" : "text-ink-950")}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-ink-500">{sub}</div> : null}
    </div>
  );
}

export function DescriptionList({ items, className }: { items: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs text-ink-500">{k}</dt>
          <dd className="mt-0.5 break-words text-ink-900">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Table primitives: semantic markup, start-aligned (RTL-aware), horizontal scroll on small screens. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)}>{children}</table>
    </div>
  );
}
export function Th({ children, className, numeric }: { children?: ReactNode; className?: string; numeric?: boolean }) {
  return <th scope="col" className={cn("border-b border-ink-200 bg-ink-50/60 px-4 py-2.5 text-xs font-medium whitespace-nowrap text-ink-600", numeric ? "text-end" : "text-start", className)}>{children}</th>;
}
export function Td({ children, className, numeric }: { children?: ReactNode; className?: string; numeric?: boolean }) {
  return <td className={cn("border-b border-ink-100 px-4 py-3 align-top text-ink-800", numeric ? "text-end tabular-nums" : "text-start", className)}>{children}</td>;
}

export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" aria-hidden className="size-7 shrink-0">
        <rect width="32" height="32" rx="8" fill="#0b5d4f" />
        <path d="M9 23V9l14 14V9" fill="none" stroke="#edf8f5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23" cy="9" r="2.4" fill="#a9dccf" />
      </svg>
      {withWordmark ? <span className="text-[15px] font-semibold tracking-[0.08em] text-ink-950">NEXVO</span> : null}
    </span>
  );
}
