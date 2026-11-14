"use client";

import { useSyncExternalStore } from "react";

/** Live result of a CSS media query; false during server rendering. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** The two-column board with red strings starts at Tailwind's lg breakpoint. */
export function useWideBoard(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
