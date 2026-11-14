"use client";

import { useState } from "react";

import type { HypothesisView } from "@/lib/case/view";

import { Button } from "./ui";

export function Hypotheses({
  hypotheses,
  clueNumbers,
  disabled,
  ended,
  onAccuse,
}: {
  hypotheses: HypothesisView[];
  clueNumbers: Map<string, number>;
  disabled: boolean;
  ended: boolean;
  onAccuse: (hypothesisId: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-3">
      {hypotheses.map((h, index) => {
        const letter = String.fromCharCode(65 + index);
        return (
          <li
            key={h.id}
            className={`rounded-card border p-4 ${
              h.status === "correct"
                ? "border-success bg-success-surface"
                : h.status === "ruled_out"
                  ? "border-border bg-surface-muted"
                  : "border-border bg-surface"
            }`}
          >
            <p className={h.status === "ruled_out" ? "text-muted line-through" : ""}>
              <span className="mr-2 font-semibold">{letter}.</span>
              {h.text}
            </p>

            {h.status === "correct" && <p className="mt-2 text-sm font-semibold text-success">✓ The answer</p>}

            {h.status === "ruled_out" && (
              <p className="mt-2 text-sm text-muted">
                Ruled out
                {h.refutedByClueId && (
                  <>
                    {" "}
                    by{" "}
                    <a href={`#clue-${h.refutedByClueId}`} className="underline">
                      clue {clueNumbers.get(h.refutedByClueId)}
                    </a>
                  </>
                )}
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
                      Accuse {letter}
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
