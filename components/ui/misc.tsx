import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Inbox, ShieldAlert } from "lucide-react";

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-sm text-ink-600">{eyebrow}</div> : null}
        <h1 className="text-[1.75rem] leading-tight text-ink-950">{title}</h1>
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
    <div className="min-w-0 px-5 py-4">
      <div className="text-sm text-ink-600">{label}</div>
      <div className={cn("display mt-1 text-[2rem] leading-none font-bold tabular-nums", tone === "danger" ? "text-danger-700" : tone === "warning" ? "text-warning-700" : "text-ink-950")}>{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-ink-600">{sub}</div> : null}
    </div>
  );
}

/** One sheet holding several metrics separated by rules — reads as a single instrument panel, not a card grid. */
export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 divide-ink-200 rounded-[var(--radius-card)] border border-ink-200 bg-white lg:grid-cols-4 lg:divide-x rtl:lg:divide-x-reverse [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-ink-200 lg:[&>*:nth-child(n+3)]:border-t-0 [&>*:nth-child(even)]:border-s [&>*:nth-child(even)]:border-ink-200 lg:[&>*:nth-child(even)]:border-s-0", className)}>
      {children}
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
export function Table({ children, className, scroll }: { children: ReactNode; className?: string; scroll?: boolean }) {
  return (
    <div className={scroll ? "max-h-[70vh] overflow-auto" : "overflow-x-auto"}>
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

/**
 * Mark: a collection round — a route line through stops, ending at the hi-vis depot dot.
 * Wordmark set in Archivo condensed.
 */
export function Logo({ className, withWordmark = true, inverted = false }: { className?: string; withWordmark?: boolean; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" aria-hidden className="size-7 shrink-0">
        <rect width="32" height="32" rx="7" fill={inverted ? "#ffffff" : "#1d2a2e"} />
        <path d="M8 24V9.5a1.5 1.5 0 0 1 2.6-1L21.4 23.5a1.5 1.5 0 0 0 2.6-1V8" fill="none" stroke={inverted ? "#1d2a2e" : "#ffffff"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="8" r="3" fill="#e8590c" />
      </svg>
      {withWordmark ? <span className={cn("display text-[1.2rem] leading-none font-bold", inverted ? "text-white" : "text-ink-950")} style={{ fontStretch: "75%" }}>Nexvo</span> : null}
    </span>
  );
}
