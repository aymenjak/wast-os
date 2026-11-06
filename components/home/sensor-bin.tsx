"use client";
import { motion, useInView } from "motion/react";
import { useReducedMotionSafe } from "./use-reduced-motion";
import { useRef } from "react";

/**
 * Illustration (not a photo): a bin with a LoRaWAN fill sensor; the level rises to the alert threshold,
 * then an example assistant exchange appears. All values are an illustrative example.
 */
export function SensorBin({ t }: { t: { fill: string; threshold: string; forecast: string; q: string; a: string; example: string } }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotionSafe();
  const level = inView || reduce ? 0.82 : 0.12;
  const H = 150; // inner height of the bin body
  return (
    <div ref={ref} className="grid items-center gap-8 sm:grid-cols-[220px_1fr]">
      <svg viewBox="0 0 220 240" role="img" aria-label={`${t.fill}: 82 %. ${t.threshold}: 80 %`} className="mx-auto w-[200px]">
        {/* sensor + signal */}
        <rect x="86" y="18" width="48" height="16" rx="4" fill="#1d2a2e" />
        <circle cx="128" cy="26" r="3" fill="#e8590c" />
        {[18, 30, 42].map((r, i) => (
          <motion.path key={r} d={`M ${110 - r * 0.7} ${8 - i * 2} Q 110 ${-r * 0.5} ${110 + r * 0.7} ${8 - i * 2}`} fill="none" stroke="#e8590c" strokeWidth="3" strokeLinecap="round"
            initial={{ opacity: 0.15 }} animate={reduce ? { opacity: 0.6 } : { opacity: [0.15, 1, 0.15] }} transition={{ duration: 1.8, repeat: reduce ? 0 : Infinity, delay: i * 0.25 }} />
        ))}
        {/* lid and body */}
        <rect x="30" y="36" width="160" height="16" rx="6" fill="#1f5a44" />
        <path d="M44 56 L176 56 L166 214 Q165 222 156 222 L64 222 Q55 222 54 214 Z" fill="#edefed" stroke="#1d2a2e" strokeWidth="4" />
        <clipPath id="bin-inner"><path d="M48 60 L172 60 L163 212 Q162 218 155 218 L65 218 Q58 218 57 212 Z" /></clipPath>
        <g clipPath="url(#bin-inner)">
          <motion.rect x="40" width="140" fill="#2a78d6" initial={false} animate={{ y: 218 - H * level, height: H * level + 10 }} transition={{ duration: reduce ? 0 : 2.2, ease: "easeInOut" }} />
        </g>
        {/* threshold 80 % */}
        <line x1="40" x2="180" y1={218 - H * 0.8} y2={218 - H * 0.8} stroke="#d03b3b" strokeWidth="3" strokeDasharray="7 6" />
        <rect x="58" y="226" width="22" height="10" rx="5" fill="#1d2a2e" /><rect x="140" y="226" width="22" height="10" rx="5" fill="#1d2a2e" />
      </svg>
      <div className="space-y-3">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-white p-3"><dt className="text-ink-600">{t.fill}</dt><dd className="display text-2xl font-bold text-ink-950">82 %</dd></div>
          <div className="rounded-md bg-white p-3"><dt className="text-ink-600">{t.threshold}</dt><dd className="display text-2xl font-bold text-danger-700">80 %</dd></div>
        </dl>
        <p className="text-sm text-ink-700">{t.forecast}</p>
        <motion.div data-reveal initial={reduce ? false : { opacity: 0, y: 10 }} animate={inView || reduce ? { opacity: 1, y: 0 } : {}} transition={{ delay: reduce ? 0 : 2.3, duration: 0.5 }} className="space-y-2 text-sm">
          <p className="ms-auto w-fit max-w-[90%] rounded-2xl rounded-ee-sm bg-ink-900 px-3 py-2 text-white">{t.q}</p>
          <p className="w-fit max-w-[95%] rounded-2xl rounded-es-sm border border-ink-200 bg-white px-3 py-2 text-ink-900">{t.a}</p>
          <p className="text-xs text-ink-600">{t.example}</p>
        </motion.div>
      </div>
    </div>
  );
}
