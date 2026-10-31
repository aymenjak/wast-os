import type { ReactNode } from "react";
import { Illustration } from "@/components/illustrations";

export function AuthCard({ title, lead, children, footer }: { title: string; lead?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <Illustration name="auth" className="mx-auto mb-4 w-72 max-w-full" />
      <div className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-xl font-semibold text-ink-950">{title}</h1>
        {lead ? <p className="mt-1 text-sm text-ink-600">{lead}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
      {footer ? <div className="mt-4 text-center text-sm text-ink-600">{footer}</div> : null}
    </div>
  );
}
