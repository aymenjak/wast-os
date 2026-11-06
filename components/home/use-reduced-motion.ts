"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Like motion's useReducedMotion, but `false` until the component has mounted. The server cannot know the visitor's
 * preference, so reading it during the first render made the server and browser HTML differ (React hydration error
 * #418 on the home page, found in the system review). The preference applies right after hydration.
 */
export function useReducedMotionSafe(): boolean {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? !!reduce : false;
}
