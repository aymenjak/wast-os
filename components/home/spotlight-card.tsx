"use client";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { ReactNode } from "react";

/** Card with a soft hi-vis spotlight that follows the pointer and a slight tilt (pointer devices only). */
export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(-200), y = useMotionValue(-200);
  const rx = useSpring(0, { stiffness: 200, damping: 20 }), ry = useSpring(0, { stiffness: 200, damping: 20 });
  const bg = useMotionTemplate`radial-gradient(320px circle at ${x}px ${y}px, rgba(232,89,12,0.12), transparent 70%)`;
  return (
    <motion.div
      className={`group relative overflow-hidden rounded-[var(--radius-card)] border border-ink-200 bg-white p-6 ${className}`}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left); y.set(e.clientY - r.top);
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 6); rx.set(-((e.clientY - r.top) / r.height - 0.5) * 6);
      }}
      onPointerLeave={() => { x.set(-200); y.set(-200); rx.set(0); ry.set(0); }}
    >
      {!reduce ? <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: bg }} /> : null}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
