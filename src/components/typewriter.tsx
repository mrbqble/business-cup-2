"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/client/media";

const TYPE_DURATION_MS = 1_400;
const TICK_MS = 24;

/**
 * Types the text out once when `animate` is set. The untyped rest is rendered invisibly, so the
 * block never changes size, and screen readers get the full text at once.
 */
export function TypewriterText({ text, animate }: { text: string; animate: boolean }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate || reduced) return;
    const step = Math.max(1, Math.ceil(text.length / (TYPE_DURATION_MS / TICK_MS)));
    const timer = setInterval(() => {
      setShown((n) => {
        const next = Math.min(text.length, n + step);
        if (next >= text.length) clearInterval(timer);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [animate, reduced, text]);

  const count = reduced ? text.length : shown;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.slice(0, count)}
        <span className="invisible">{text.slice(count)}</span>
      </span>
    </>
  );
}
