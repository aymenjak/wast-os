"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotionSafe } from "./use-reduced-motion";

type Tab = { id: string; label: string; caption: string; src: string; width: number; height: number; phone?: boolean };

/** Tabs over REAL product screenshots (synthetic demo data), in a browser or phone frame. Keyboard: arrows/Home/End. */
export function ProductTour({ tabs, label, note }: { tabs: Tab[]; label: string; note: string }) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotionSafe();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const t = tabs[active]!;
  const move = (i: number) => { const n = (i + tabs.length) % tabs.length; setActive(n); refs.current[n]?.focus(); };
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
        {tabs.map((x, i) => (
          <button key={x.id} ref={(el) => { refs.current[i] = el; }} role="tab" id={`tour-tab-${x.id}`} aria-selected={i === active} aria-controls="tour-panel" tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              const rtl = document.documentElement.dir === "rtl";
              if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) move(i + 1);
              else if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) move(i - 1);
              else if (e.key === "Home") move(0);
              else if (e.key === "End") move(tabs.length - 1);
            }}
            className="relative rounded-full px-4 py-2 text-sm font-semibold text-ink-700 transition-colors aria-selected:text-white">
            {i === active ? <motion.span layoutId="tour-pill" className="absolute inset-0 rounded-full bg-ink-900" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }} /> : null}
            <span className="relative">{x.label}</span>
          </button>
        ))}
      </div>
      <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${t.id}`} className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure key={t.id} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className={t.phone ? "mx-auto w-[260px] sm:w-[300px]" : ""}>
            <div className={t.phone ? "overflow-hidden rounded-[2rem] border-[10px] border-ink-900 bg-ink-900 shadow-2xl" : "overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white shadow-[0_30px_80px_-30px_rgba(29,42,46,0.45)]"}>
              {!t.phone ? (
                <div aria-hidden className="flex items-center gap-1.5 border-b border-ink-100 bg-ink-50 px-3 py-2" dir="ltr">
                  <span className="size-2.5 rounded-full bg-[#e46b5d]" /><span className="size-2.5 rounded-full bg-[#e9b949]" /><span className="size-2.5 rounded-full bg-[#5cb36b]" />
                  <span className="ms-3 truncate rounded bg-white px-2 py-0.5 text-[11px] text-ink-600">app.nexvo.dz</span>
                </div>
              ) : null}
              <Image src={t.src} alt={t.caption} width={t.width} height={t.height} sizes={t.phone ? "300px" : "(min-width: 1152px) 1100px, 100vw"} className="block h-auto w-full" priority={active === 0} />
            </div>
            <figcaption className="mt-3 text-sm text-ink-700">{t.caption} <span className="text-ink-600">— {note}</span></figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
    </div>
  );
}
