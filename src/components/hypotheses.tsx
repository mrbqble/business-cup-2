"use client";

import { useState } from "react";

import type { HypothesisView } from "@/lib/case/view";

import { Button } from "./ui";

/** The four theories as suspect cards: a wrong accusation stamps a red X on the card. */
export function Hypotheses({
  hypotheses,
  clueNumbers,
  disabled,
  ended,
  freshIds,
  onAccuse,
  onShowClue,
}: {
  hypotheses: HypothesisView[];
  clueNumbers: Map<string, number>;
  disabled: boolean;
  ended: boolean;
  freshIds: ReadonlySet<string>;
  onAccuse: (hypothesisId: string) => void;
  onShowClue: (clueId: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-4">
      {hypotheses.map((h, index) => {
        const letter = String.fromCharCode(65 + index);
        const fresh = freshIds.has(h.id);
        return (
          <li
            key={h.id}
            id={`suspect-${h.id}`}
            className={`paper relative overflow-hidden rounded-card p-4 ${h.status === "correct" ? "ring-4 ring-success" : ""}`}
          >
            <p className="font-typewriter text-xs tracking-wider text-muted uppercase">Theory {letter}</p>
            <p className={`mt-1 pr-16 font-display text-base leading-snug ${h.status === "ruled_out" ? "text-muted" : ""}`}>{h.text}</p>

            {h.status === "ruled_out" && (
              <>
                <svg
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 h-full w-full ${fresh ? "animate-pop-in" : ""}`}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {["M6 8 L94 92", "M94 8 L6 92"].map((d) => (
                    <path
                      key={d}
                      d={d}
                      stroke="var(--string-red)"
                      strokeOpacity="0.55"
                      strokeWidth="4"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                    />
                  ))}
                </svg>
                <span className={`stamp absolute top-3 right-3 text-xs text-stamp-red ${fresh ? "animate-stamp" : "rotate-6"}`}>Ruled out</span>
              </>
            )}
            {h.status === "correct" && <span className="stamp absolute top-3 right-3 rotate-6 text-sm text-stamp-green">The answer</span>}

            {h.status === "ruled_out" && h.refutedByClueId && (
              <p className="relative mt-2 text-sm text-muted">
                Ruled out by{" "}
                <a
                  href={`#clue-${h.refutedByClueId}`}
                  onClick={() => onShowClue(h.refutedByClueId!)}
                  className="inline-flex min-h-11 items-center font-semibold text-danger underline"
                >
                  clue {clueNumbers.get(h.refutedByClueId)}
                </a>
              </p>
            )}

            {h.status === "open" && !ended && (
              <div className="mt-3 flex flex-wrap gap-2">
                {confirming === h.id ? (
                  <>
                    <Button
                      variant="danger"
                      disabled={disabled}
                      onClick={() => {
                        setConfirming(null);
                        onAccuse(h.id);
                      }}
                    >
                      Accuse theory {letter}
                    </Button>
                    <Button variant="secondary" onClick={() => setConfirming(null)}>
                      Cancel
                    </Button>
                    <p className="w-full text-xs text-muted">If this is wrong, you lose a life and 200 points.</p>
                  </>
                ) : (
                  <Button variant="secondary" disabled={disabled} onClick={() => setConfirming(h.id)}>
                    Accuse
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
