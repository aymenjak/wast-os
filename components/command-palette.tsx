"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { searchAction } from "@/app/actions/business";
import type { SearchHit } from "@/server/services/search";
import { cn } from "@/lib/utils";

/** Ctrl/⌘+K quick search across the tenant's records. Built on the native <dialog> for focus trapping and Esc. */
export function CommandPalette() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();

  const open = () => {
    dialog.current?.showModal();
    setTimeout(() => input.current?.focus(), 0);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const id = setTimeout(() => start(async () => { setHits(await searchAction(q, locale)); setActive(0); }), 180);
    return () => clearTimeout(id);
  }, [q, locale]);

  const go = (h: SearchHit) => {
    dialog.current?.close();
    setQ("");
    router.push(h.href);
  };

  return (
    <>
      <button type="button" onClick={open} className="flex h-9 w-full max-w-72 items-center gap-2 rounded-[var(--radius-control)] border border-ink-200 bg-white px-3 text-sm text-ink-600 hover:border-ink-300">
        <Search aria-hidden className="size-4" />
        <span className="flex-1 truncate text-start">{t("search.open")}</span>
        <kbd className="num hidden rounded border border-ink-200 px-1.5 text-[11px] text-ink-600 sm:inline">{t("search.shortcut")}</kbd>
      </button>
      <dialog ref={dialog} aria-label={t("search.open")} className="m-auto mt-[12vh] w-[min(40rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-ink-200 bg-white p-0 shadow-[var(--shadow-pop)] backdrop:bg-ink-950/40" onClose={() => setQ("")}>
        <div className="flex items-center gap-2 border-b border-ink-200 px-4">
          <Search aria-hidden className="size-4 text-ink-500" />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && hits[active]) go(hits[active]!);
            }}
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="palette-results"
            aria-activedescendant={hits[active] ? `hit-${active}` : undefined}
            aria-label={t("search.placeholder")}
            placeholder={t("search.placeholder")}
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-400"
          />
        </div>
        <ul id="palette-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? <li className="px-3 py-6 text-center text-sm text-ink-600">{t("search.minChars")}</li>
            : !pending && hits.length === 0 ? <li className="px-3 py-6 text-center text-sm text-ink-600">{t("search.empty")}</li>
            : hits.map((h, i) => (
              <li key={`${h.type}-${h.id}`} id={`hit-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(h)} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-start", i === active ? "bg-ink-100" : "")}>
                  <span className="w-28 shrink-0 text-xs text-ink-600">{t(`search.types.${h.type}`)}</span>
                  <span className="num min-w-0 truncate font-medium text-ink-900" dir="auto">{h.title}</span>
                  {h.subtitle ? <span className="min-w-0 truncate text-sm text-ink-600">{h.subtitle}</span> : null}
                </button>
              </li>
            ))}
        </ul>
      </dialog>
    </>
  );
}
