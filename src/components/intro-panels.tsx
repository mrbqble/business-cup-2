"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { caseLabel } from "@/lib/case/label";
import type { CaseSummary, NarrationView } from "@/lib/case/view";
import type { Exhibit } from "@/lib/sources/exhibits";

import { Archivist } from "./archivist";
import { ExhibitCredit, ExhibitImage } from "./exhibits";
import { Button } from "./ui";

const PANELS = 3;
const SWIPE_PX = 40;

/** The comic briefing before the board: setting, mystery, your task. Shown once per play. */
export function IntroPanels({
  summary,
  narration,
  exhibits,
  onDone,
}: {
  summary: CaseSummary;
  narration: NarrationView;
  exhibits: Exhibit[];
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const touchX = useRef<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);

  const advance = useCallback(() => {
    if (step < PANELS - 1) setStep(step + 1);
    else onDone();
  }, [step, onDone]);
  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") advance();
      else if (event.key === "ArrowLeft") back();
      else if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, back, onDone]);

  useEffect(() => {
    stage.current?.focus({ preventScroll: true });
  }, [step]);

  const cover = exhibits[0] ?? null;
  const second = exhibits[1] ?? cover;
  const kicker = `${caseLabel(summary)} · ${summary.era}`;

  return (
    <section aria-label="Case briefing" className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-typewriter text-sm tracking-widest text-muted uppercase">
          Briefing {step + 1} of {PANELS}
        </p>
        <button type="button" onClick={onDone} className="min-h-11 px-2 text-sm font-semibold underline">
          Skip intro
        </button>
      </div>

      <div
        ref={stage}
        key={step}
        tabIndex={-1}
        role="group"
        aria-roledescription="panel"
        aria-label={`Panel ${step + 1} of ${PANELS}`}
        className="comic-panel animate-panel-in cursor-pointer rounded-[3px] outline-none"
        onClick={advance}
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start === null || end === undefined) return;
          if (end - start < -SWIPE_PX) advance();
          else if (end - start > SWIPE_PX) back();
        }}
      >
        {step === 0 && (
          <Frame image={cover} fallback={<p className="font-display text-4xl font-semibold">{summary.era}</p>}>
            <Caption kicker={kicker}>{narration.setting}</Caption>
          </Frame>
        )}
        {step === 1 && (
          <div className="grid gap-0 sm:grid-cols-2">
            <Frame image={second} fallback={<span className="font-display text-7xl">?</span>} />
            <div className="flex flex-col justify-center gap-4 border-t-3 border-comic-ink p-4 sm:border-t-0 sm:border-l-3">
              <p className="font-display text-2xl leading-snug font-semibold">{summary.title}</p>
              <Caption>{narration.mystery}</Caption>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-5 bg-[radial-gradient(circle_at_30%_20%,#fff6dc,transparent_60%)] p-5 sm:flex-row sm:items-end sm:p-8">
            <div className="flex flex-col items-center gap-1">
              <Archivist className="h-20 w-20 sm:h-24 sm:w-24" />
              <span className="font-typewriter text-xs tracking-widest uppercase">The Archivist</span>
            </div>
            <p className="speech-bubble mb-3 p-4 text-base leading-relaxed sm:mb-10 sm:text-lg">{narration.task}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2" aria-hidden>
          {Array.from({ length: PANELS }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full ${i === step ? "bg-desk-text" : "bg-desk-text/30"}`} />
          ))}
        </div>
        <Button onClick={advance}>{step < PANELS - 1 ? "Next" : "Open the case file"}</Button>
      </div>
      {cover && (
        <p className="text-xs text-muted">
          Images: <ExhibitCredit exhibit={cover} />
          {second && second !== cover && (
            <>
              ; <ExhibitCredit exhibit={second} />
            </>
          )}
        </p>
      )}
    </section>
  );
}

function Frame({ image, fallback, children }: { image: Exhibit | null; fallback?: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative">
      {image ? (
        <div className="halftone relative">
          <ExhibitImage exhibit={image} eager className="max-h-[55vh] contrast-125 grayscale-[35%]" />
        </div>
      ) : (
        <div className="flex aspect-[4/3] max-h-[55vh] w-full items-center justify-center bg-[repeating-linear-gradient(45deg,#efe2c4_0_10px,#e7d6b0_10px_20px)] text-comic-ink">
          {fallback}
        </div>
      )}
      {children && <div className="p-3 sm:absolute sm:top-4 sm:left-4 sm:max-w-[70%] sm:p-0">{children}</div>}
    </div>
  );
}

function Caption({ kicker, children }: { kicker?: string; children: ReactNode }) {
  return (
    <div className="caption-box p-3">
      {kicker && <p className="font-typewriter text-[0.7rem] tracking-widest uppercase">{kicker}</p>}
      <p className="mt-0.5 text-sm leading-snug font-semibold sm:text-base">{children}</p>
    </div>
  );
}
