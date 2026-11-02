import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({ className, children, as: Tag = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" }) {
  return <Tag className={cn("rounded-[var(--radius-card)] border border-ink-200 bg-white", className)}>{children}</Tag>;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-3.5", className)}>
      <div className="min-w-0">
        <h2 className="text-[1.05rem] font-bold text-ink-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-600">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
