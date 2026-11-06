"use client";
import { motion } from "motion/react";
import { useReducedMotionSafe } from "./use-reduced-motion";

/**
 * Endless strip of capability chips; pauses on hover. One structure for every visitor (no hydration mismatch): with
 * reduced motion, CSS (globals.css, [data-marquee]) shows a static wrapped list from the first paint, without the edge
 * fade, and the animation is not started. The duplicated copy that makes the loop seamless is aria-hidden.
 */
export function Marquee({ items, label }: { items: string[]; label: string }) {
  const reduce = useReducedMotionSafe();
  const chip = (s: string, k: string) => <li key={k} className="shrink-0 rounded-full border border-white/15 px-4 py-1.5 text-sm text-[#d7dfdc] motion-reduce:max-w-full motion-reduce:shrink motion-reduce:text-center">{s}</li>;
  return (
    <div data-marquee className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" dir="ltr">
      <motion.div data-marquee-track className="flex w-max gap-3 group-hover:[animation-play-state:paused]" animate={reduce ? undefined : { x: ["0%", "-50%"] }} transition={{ duration: 40, ease: "linear", repeat: Infinity }}>
        <ul aria-label={label} className="flex gap-3">{items.map((s) => chip(s, s))}</ul>
        <ul data-marquee-dup aria-hidden className="flex gap-3">{items.map((s) => chip(s, `dup-${s}`))}</ul>
      </motion.div>
    </div>
  );
}
