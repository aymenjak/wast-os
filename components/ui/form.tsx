"use client";
import { createContext, useActionState, useContext, useEffect, useId, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { initialState, type ActionState } from "@/lib/actions/state";
import { useI18n } from "@/components/i18n-provider";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;
const FieldErrors = createContext<Record<string, string> | undefined>(undefined);

/**
 * Progressive-enhancement form bound to a server action. Shows a summary alert and
 * per-field messages from the server; the server is always the source of validation truth.
 */
/** Restores text, select, textarea, checkbox and radio values from a FormData snapshot (files and hidden fields are left alone). */
function restoreFields(form: HTMLFormElement, data: FormData) {
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) || !el.name) continue;
    if (el instanceof HTMLInputElement) {
      if (el.type === "file" || el.type === "hidden" || el.type === "password") continue;
      if (el.type === "checkbox" || el.type === "radio") { el.checked = data.getAll(el.name).includes(el.value || "on"); continue; }
    }
    if (el instanceof HTMLSelectElement && el.multiple) {
      const values = data.getAll(el.name).map(String);
      for (const o of Array.from(el.options)) o.selected = values.includes(o.value);
      continue;
    }
    const v = data.get(el.name);
    if (typeof v === "string") el.value = v;
  }
}

export function ActionForm({
  action,
  children,
  className,
  successMessage,
  resetOnSuccess = false,
  hidden,
  onResult,
  encType,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  resetOnSuccess?: boolean;
  hidden?: Record<string, string>;
  onResult?: (s: ActionState) => void;
  encType?: "multipart/form-data";
}) {
  const { locale, t } = useI18n();
  const [state, formAction] = useActionState(action, initialState);
  const ref = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const submitted = useRef<FormData | null>(null);
  useEffect(() => {
    if (!state.nonce) return;
    if (state.ok && resetOnSuccess) ref.current?.reset();
    // React 19 resets uncontrolled fields after every form action; on an error, put back what the user typed.
    if (state.error && ref.current && submitted.current) restoreFields(ref.current, submitted.current);
    if (state.error) alertRef.current?.focus();
    onResult?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nonce]);

  return (
    <form ref={ref} action={formAction} onSubmit={(e) => { submitted.current = new FormData(e.currentTarget); }} className={className} encType={encType} noValidate>
      <input type="hidden" name="locale" value={locale} />
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {state.error ? (
        <div ref={alertRef} tabIndex={-1} role="alert" className="mb-4 flex gap-2 rounded-[var(--radius-control)] border border-danger-100 bg-danger-100/60 px-3 py-2.5 text-sm text-danger-700">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{t(state.error, state.errorVars)}</span>
        </div>
      ) : state.ok && successMessage ? (
        <div role="status" className="mb-4 flex gap-2 rounded-[var(--radius-control)] border border-success-100 bg-success-100/60 px-3 py-2.5 text-sm text-success-700">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      ) : null}
      <FieldErrors.Provider value={state.fields}>{children}</FieldErrors.Provider>
    </form>
  );
}

export function Field({
  label,
  name,
  hint,
  optional,
  children,
  className,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  optional?: boolean;
  children: (props: { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const errors = useContext(FieldErrors);
  const { t } = useI18n();
  const err = errors?.[name.replace(/\[\]$/, "")];
  const describedBy = [hint ? `${id}-hint` : null, err ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink-800">
        {label}
        {optional ? <span className="ms-1 font-normal text-ink-500">({t("common.optional")})</span> : null}
      </label>
      {children({ id, name, "aria-invalid": err ? true : undefined, "aria-describedby": describedBy })}
      {hint ? <p id={`${id}-hint`} className="text-xs text-ink-600">{hint}</p> : null}
      {err ? <p id={`${id}-err`} className="text-xs font-medium text-danger-700">{t(`errors.field.${err}`) === `errors.field.${err}` ? t("errors.field.custom") : t(`errors.field.${err}`)}</p> : null}
    </div>
  );
}

const control =
  "w-full rounded-[var(--radius-control)] border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-500 hover:border-ink-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 aria-[invalid=true]:border-danger-700 disabled:bg-ink-100";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2", className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cn(control, "h-10 pe-8", className)} {...p} />;
}

export function Checkbox({ label, ...p }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    // 44 px tall tap area and a 20 px box: usable with gloves in the field (pre-pilot field test).
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink-800">
      <input type="checkbox" className="size-5 shrink-0 rounded border-ink-300 accent-brand-700" {...p} />
      {label}
    </label>
  );
}

export function SubmitButton({ children, variant = "primary", className, size = "md", name, value, busy = false, disabled = false }: { children: ReactNode; variant?: "primary" | "secondary" | "danger" | "subtle"; className?: string; size?: "sm" | "md" | "lg"; name?: string; value?: string; busy?: boolean; disabled?: boolean }) {
  const formStatus = useFormStatus();
  const pending = formStatus.pending || busy;
  const { t } = useI18n();
  const v = {
    primary: "bg-brand-700 text-white hover:bg-brand-800",
    secondary: "bg-white text-ink-900 border border-ink-200 hover:bg-ink-50",
    danger: "bg-white text-danger-700 border border-danger-100 hover:bg-danger-100",
    subtle: "bg-brand-50 text-brand-800 hover:bg-brand-100",
  }[variant];
  const s = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-base" }[size];
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} aria-busy={pending} className={cn("inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium transition-colors disabled:opacity-60", v, s, className)}>
      {pending ? t("common.loading") : children}
    </button>
  );
}
