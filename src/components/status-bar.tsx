"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/lib/client/media";

const LIVES = 3;

export function Hearts({ livesLeft, justLost }: { livesLeft: number; justLost: boolean }) {
  return (
    <p aria-label={`${livesLeft} of ${LIVES} lives left`} className="flex gap-1 text-2xl leading-none">
      {Array.from({ length: LIVES }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={`inline-block ${i < livesLeft ? "text-[#ff6b5e]" : "text-desk-muted/40"} ${justLost && i === livesLeft ? "animate-heart-break" : ""}`}
        >
          {i < livesLeft ? "♥" : "♡"}
        </span>
      ))}
    </p>
  );
}

/** Counts to the new score; shows the change floating up. */
export function ScoreCounter({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const [change, setChange] = useState<{ amount: number; key: number } | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) return;
    let frame = requestAnimationFrame((startedAt) => {
      setChange({ amount: value - from, key: startedAt });
      const tick = (now: number) => {
        const t = reduced ? 1 : Math.min(1, (now - startedAt) / 650);
        setDisplay(Math.round(from + (value - from) * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      tick(startedAt);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return (
    <p className="relative font-typewriter text-xl tabular-nums" aria-label={`${value} points`}>
      <span aria-hidden>
        {display}
        <span className="ml-1 text-sm text-desk-muted">pts</span>
      </span>
      {change && change.amount !== 0 && (
        <span key={change.key} aria-hidden className="animate-rise-fade absolute -top-4 right-0 text-sm text-[#ff8a7f]">
          {change.amount > 0 ? `+${change.amount}` : `−${Math.abs(change.amount)}`}
        </span>
      )}
    </p>
  );
}
