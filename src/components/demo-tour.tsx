"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PlayView } from "@/lib/case/view";
import { api } from "@/lib/client/api";
import type { DemoTour as Tour } from "@/lib/demo/tour";

import { CaseResult } from "./case-result";
import { ClueCard, SealedClue } from "./clue-card";
import { ExhibitGallery } from "./exhibits";
import { Hypotheses } from "./hypotheses";
import { IntroPanels } from "./intro-panels";
import { RedStrings } from "./red-strings";
import { Hearts, ScoreCounter } from "./status-bar";
import { Button, Card, ErrorState, Spinner } from "./ui";

const STEPS = [
  {
    title: "The briefing",
    note: "Every case opens with three comic panels: real archive images from Wikimedia Commons, captions written only from the case's own facts.",
    next: "Open the case file",
  },
  {
    title: "The evidence board",
    note: "Two opening clues, six sealed files and four theories. Every quote is copied from Wikipedia, and code checked it character by character before anyone saw it.",
    next: "Open a sealed file (−100)",
  },
  {
    title: "A sealed file opens",
    note: "The quote types out under a VERIFIED stamp, with its source one tap away.",
    next: "Accuse a theory",
  },
  {
    title: "A wrong accusation",
    note: "It costs a life and 200 points, and reveals the clue that rules the theory out (a red string on desktop).",
    next: "Name the answer",
  },
  {
    title: "Case closed",
    note: "The verdict, the closing panel and a rank promotion, then the solution with every claim linked to its clue and source.",
    next: "Challenge a friend",
  },
  {
    title: "Challenge a friend",
    note: "Every finished case can recruit a friend: no sign-up, no spoilers, and a side-by-side once they finish.",
    next: "See plans and pricing",
  },
] as const;

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; tour: Tour };

async function loadTour(): Promise<Load> {
  try {
    return { status: "ready", tour: (await api.demo()).tour };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/** Demo mode: a guided path through one sample case, played by script on the server. Nothing is saved. */
export function DemoTour() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState(0);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void loadTour().then((next) => {
      if (active) setLoad(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const go = (next: number) => {
    setStep(next);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={top} className="flex scroll-mt-4 flex-col gap-5">
      <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-card border-2 border-caption bg-caption/15 px-4 py-2 text-sm">
        <span>
          <strong>Demo mode:</strong> a guided tour on a sample case. Nothing here is saved or counted.
        </span>
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold underline">
          Exit demo
        </Link>
      </div>

      {load.status === "loading" && <Spinner label="Preparing the demo case" />}
      {load.status === "error" && <ErrorState message={load.message} onRetry={() => setAttempt((n) => n + 1)} />}
      {load.status === "ready" && (
        <>
          <Card className="flex flex-col gap-1">
            <p className="font-typewriter text-xs tracking-widest text-muted uppercase">
              Step {step + 1} of {STEPS.length}: {STEPS[step].title}
            </p>
            <p className="text-sm">{STEPS[step].note}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {step > 0 && (
                <Button variant="secondary" onClick={() => go(step - 1)}>
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button onClick={() => go(step + 1)}>{STEPS[step].next}</Button>
              ) : (
                <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-sm font-semibold text-accent-text">
                  {STEPS[step].next}
                </Link>
              )}
            </div>
          </Card>
          <DemoStep step={step} tour={load.tour} onIntroDone={() => go(1)} />
        </>
      )}
    </div>
  );
}

function DemoStep({ step, tour, onIntroDone }: { step: number; tour: Tour; onIntroDone: () => void }) {
  const refuting = tour.ruled.hypotheses.find((h) => h.id === tour.ruledHypothesisId)?.refutedByClueId ?? null;
  switch (step) {
    case 0:
      return <IntroPanels summary={tour.initial.case} narration={tour.initial.narration} exhibits={tour.initial.exhibits} onDone={onIntroDone} />;
    case 1:
      return <DemoBoard view={tour.initial} />;
    case 2:
      return <DemoBoard view={tour.opened} freshClues={[tour.openedClueId]} />;
    case 3:
      return <DemoBoard view={tour.ruled} freshClues={refuting && refuting !== tour.openedClueId ? [refuting] : []} freshHypotheses={[tour.ruledHypothesisId]} highlight={refuting} />;
    case 4:
      return (
        <div className="flex flex-col gap-6">
          <CaseResult view={tour.solved} playId="demo" clueNumbers={numbers(tour.solved)} promotion={tour.promotion} justEnded demo />
          <DemoBoard view={tour.solved} />
        </div>
      );
    default:
      return <DemoChallenge view={tour.solved} />;
  }
}

function numbers(view: PlayView): Map<string, number> {
  return new Map(view.clues.map((c, i) => [c.id, i + 1] as const));
}

function DemoBoard({
  view,
  freshClues = [],
  freshHypotheses = [],
  highlight = null,
}: {
  view: PlayView;
  freshClues?: string[];
  freshHypotheses?: string[];
  highlight?: string | null;
}) {
  const board = useRef<HTMLDivElement>(null);
  const clueNumbers = useMemo(() => numbers(view), [view]);
  const freshClueSet = useMemo(() => new Set(freshClues), [freshClues]);
  const freshHypothesisSet = useMemo(() => new Set(freshHypotheses), [freshHypotheses]);
  const strings = useMemo(
    () => view.hypotheses.flatMap((h) => (h.status === "ruled_out" && h.refutedByClueId ? [{ from: h.id, to: h.refutedByClueId }] : [])),
    [view],
  );
  const ended = view.status !== "in_progress";

  return (
    <div className="flex flex-col gap-5">
      {!ended && (
        <header>
          <p className="font-typewriter text-sm tracking-widest text-muted uppercase">
            Sample case · {view.case.category} · {view.case.era}
          </p>
          <h1 className="mt-1 font-display text-2xl leading-snug font-semibold sm:text-3xl">{view.case.title}</h1>
        </header>
      )}
      <div className="-mx-4 flex items-center justify-between gap-3 border-y border-border bg-desk/95 px-4 py-2">
        <Hearts livesLeft={view.livesLeft} justLost={freshHypotheses.length > 0} />
        <ScoreCounter value={view.score} />
      </div>
      <div ref={board} className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-14">
        <section aria-label="Evidence" className="flex flex-col gap-4">
          <h2 className="font-typewriter text-xl tracking-wider uppercase">Evidence</h2>
          {view.clues.map((clue, index) =>
            clue.sealed ? (
              <SealedClue key={clue.id} clue={clue} number={index + 1} disabled onOpen={() => {}} />
            ) : (
              <ClueCard
                key={clue.id}
                clue={clue}
                number={index + 1}
                exhibit={clue.exhibitIndex === null ? null : (view.exhibits[clue.exhibitIndex] ?? null)}
                revealedByMistake={!ended && clue.revealedByMistake}
                fresh={freshClueSet.has(clue.id)}
                highlighted={highlight === clue.id}
              />
            ),
          )}
        </section>
        <section aria-label="Theories" className="flex flex-col gap-4">
          <h2 className="font-typewriter text-xl tracking-wider uppercase">Theories</h2>
          <Hypotheses
            hypotheses={view.hypotheses}
            clueNumbers={clueNumbers}
            disabled
            ended={ended}
            freshIds={freshHypothesisSet}
            onAccuse={() => {}}
            onShowClue={() => {}}
          />
        </section>
        <RedStrings boardRef={board} links={strings} freshIds={freshHypothesisSet} />
      </div>
      {!ended && <ExhibitGallery exhibits={view.exhibits} />}
    </div>
  );
}

function DemoChallenge({ view }: { view: PlayView }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="font-display text-lg font-semibold">Challenge a friend</p>
        <p className="mt-1 text-sm text-muted">
          After a real case, this button creates a short link (like <span className="font-typewriter">/c/k7Qm2xPa</span>). Your friend plays the
          same case as their own anonymous player; your result stays sealed until they finish. On desktop a QR code appears too.
        </p>
        <Button className="mt-3" disabled>
          Create a challenge link
        </Button>
      </Card>
      <Card>
        <p className="font-typewriter text-xs tracking-widest text-muted uppercase">Example comparison, once the friend finishes</p>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-1 font-normal" />
              <th scope="col" className="py-1">You</th>
              <th scope="col" className="py-1">Your friend</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Score", String(view.score), "900"],
              ["Clues opened", "1", "0"],
              ["Wrong accusations", "1", "1"],
              ["Time", "4:12", "6:05"],
            ].map(([label, you, friend]) => (
              <tr key={label} className="border-t border-border">
                <th scope="row" className="py-2 pr-2 text-left font-normal text-muted">
                  {label}
                </th>
                <td className="py-2 pr-2 font-semibold tabular-nums">{you}</td>
                <td className="py-2 font-semibold tabular-nums">{friend}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline">
          Try it for real: play today&apos;s case, then challenge a friend
        </Link>
      </Card>
    </div>
  );
}
