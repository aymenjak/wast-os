"use client";
import { useRef } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/public";
import { wipeSentFieldData } from "@/lib/client/field-store";

/** Sign-out that first removes offline driver data with nothing left to send (SECURITY.md gap 8). */
export function LogoutButton({ locale, label }: { locale: string; label: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const done = useRef(false);
  return (
    <form ref={ref} action={logoutAction} onSubmit={async (e) => {
      if (done.current) return;
      e.preventDefault();
      await wipeSentFieldData();
      done.current = true;
      ref.current?.requestSubmit();
    }}>
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" aria-label={label} title={label} className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-ink-700 hover:bg-ink-100">
        <LogOut aria-hidden className="size-4 rtl:rotate-180" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    </form>
  );
}
