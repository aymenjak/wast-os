"use client";
import { motion, useReducedMotion } from "motion/react";

/** Endless strip of capability chips; pauses on hover; static wrap with reduced motion. Duplicated copy is aria-hidden. */
export function Marquee({ items, label }: { items: string[]; label: string }) {
  const reduce = useReducedMotion();
  const chip = (s: string, k: string) => <li key={k} className="shrink-0 rounded-full border border-white/15 px-4 py-1.5 text-sm text-[#d7dfdc]">{s}</li>;
  if (reduce) return <ul aria-label={label} className="flex flex-wrap justify-center gap-2">{items.map((s) => chip(s, s))}</ul>;
  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" dir="ltr">
      <motion.div className="flex w-max gap-3 group-hover:[animation-play-state:paused]" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 40, ease: "linear", repeat: Infinity }}>
        <ul aria-label={label} className="flex gap-3">{items.map((s) => chip(s, s))}</ul>
        <ul aria-hidden className="flex gap-3">{items.map((s) => chip(s, `dup-${s}`))}</ul>
      </motion.div>
    </div>
  );
}
