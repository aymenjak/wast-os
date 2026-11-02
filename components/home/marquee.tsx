"use client";
import { motion, useReducedMotion } from "motion/react";

/** Endless strip of capability chips; pauses on hover; static wrap with reduced motion. Duplicated copy is aria-hidden. */
export function Marquee({ items, label }: { items: string[]; label: string }) {
  const reduce = useReducedMotion();
  const chip = (s: string, k: string, wrap = false) => <li key={k} className={`rounded-full border border-white/15 px-4 py-1.5 text-sm text-[#d7dfdc] ${wrap ? "max-w-full text-center" : "shrink-0"}`}>{s}</li>;
  // Static list for reduced motion: long chips (e.g. French) may wrap instead of pushing the page sideways on phones.
  if (reduce) return <ul aria-label={label} className="flex flex-wrap justify-center gap-2 px-4">{items.map((s) => chip(s, s, true))}</ul>;
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" dir="ltr">
      <motion.div className="flex w-max gap-3 group-hover:[animation-play-state:paused]" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 40, ease: "linear", repeat: Infinity }}>
        <ul aria-label={label} className="flex gap-3">{items.map((s) => chip(s, s))}</ul>
        <ul aria-hidden className="flex gap-3">{items.map((s) => chip(s, `dup-${s}`))}</ul>
      </motion.div>
    </div>
  );
}
