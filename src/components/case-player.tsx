"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";

import type { PlayView } from "@/lib/case/view";
import { api, ApiError, type PlayResponse } from "@/lib/client/api";
import { refreshMe } from "@/lib/client/me";
import { storage } from "@/lib/client/storage";
import type { Rank } from "@/lib/game/rank";

import { Archivist } from "./archivist";
import { CaseResult } from "./case-result";
import { ClueCard, SealedClue } from "./clue-card";
import { ExhibitGallery } from "./exhibits";
import { Hypotheses } from "./hypotheses";
import { IntroPanels } from "./intro-panels";
import { RedStrings } from "./red-strings";
import { Hearts, ScoreCounter } from "./status-bar";
import { ErrorState, Spinner } from "./ui";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; playId: string; view: PlayView; showIntro: boolean };

type Notice = { tone: "info" | "error"; text: string };

/** What the last move changed, so only those cards animate. */
interface Fresh {
  clues: ReadonlySet<string>;
  hypotheses: ReadonlySet<string>;
  lifeLost: boolean;
  ended: boolean;
}

const NOTHING_FRESH: Fresh = { clues: new Set(), hypotheses: new Set(), lifeLost: false, ended: false };
const HIGHLIGHT_MS = 3_200;

const introKey = (playId: string) => `dailycase:intro:${playId}`;

/** A play nobody has touched yet: no clue opened, no accusation made. */
function untouched(view: PlayView): boolean {
  return view.status === "in_progress" && view.score === 1000 && view.livesLeft === 3;
}

/** Starts this player's play of the case; the server resumes the existing play when there is one. */
async function resumeOrStart(slug: string): Promise<Load> {
  try {
    const started = await api.startPlay(slug);
    const showIntro = untouched(started.view) && storage.get(introKey(started.playId)) === null;
    return { status: "ready", playId: started.playId, view: started.view, showIntro };
  } catch (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return { status: "error", notFound, message: notFound ? "We couldn't find this case." : messageOf(error) };
  }
}

function changes(before: PlayView, after: PlayView): Fresh {
  const sealedBefore = new Set(before.clues.filter((c) => c.sealed).map((c) => c.id));
  const ruledBefore = new Set(before.hypotheses.filter((h) => h.status === "ruled_out").map((h) => h.id));
  return {
    clues: new Set(after.clues.filter((c) => !c.sealed && sealedBefore.has(c.id)).map((c) => c.id)),
    hypotheses: new Set(after.hypotheses.filter((h) => h.status === "ruled_out" && !ruledBefore.has(h.id)).map((h) => h.id)),
    lifeLost: after.livesLeft < before.livesLeft,
    ended: before.status === "in_progress" && after.status !== "in_progress",
  };
}

export function CasePlayer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [fresh, setFresh] = useState<Fresh>(NOTHING_FRESH);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [promotion, setPromotion] = useState<Rank | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void resumeOrStart(slug).then((next) => {
      if (active) setLoad(next);
    });
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  const view = load.status === "ready" ? load.view : null;
  const clueNumbers = useMemo(() => new Map(view ? view.clues.map((c, i) => [c.id, i + 1] as const) : []), [view]);
  const strings = useMemo(
    () => (view ? view.hypotheses.flatMap((h) => (h.status === "ruled_out" && h.refutedByClueId ? [{ from: h.id, to: h.refutedByClueId }] : [])) : []),
    [view],
  );

  const retry = () => {
    setLoad({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  if (load.status === "loading") return <Spinner label="Opening the case file" />;
  if (load.status === "error") {
    return (
      <div className="mx-auto max-w-2xl">
        <ErrorState message={load.message} onRetry={load.notFound ? undefined : retry}>
          <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
            Go to today&apos;s case
          </Link>
        </ErrorState>
      </div>
    );
  }

  const { playId } = load;
  const current = load.view;
  const ended = current.status !== "in_progress";

  if (load.showIntro) {
    return (
      <IntroPanels
        summary={current.case}
        narration={current.narration}
        exhibits={current.exhibits}
        onDone={() => {
          storage.set(introKey(playId), "seen");
          setLoad({ ...load, showIntro: false });
        }}
      />
    );
  }

  function flash(clueId: string) {
    clearTimeout(highlightTimer.current);
    setHighlight(clueId);
    highlightTimer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
  }

  async function act(run: () => Promise<PlayResponse>, describe: (next: PlayView) => string) {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const next = await run();
      const changed = changes(current, next.view);
      setFresh(changed);
      if (next.promotion !== undefined) setPromotion(next.promotion);
      setLoad({ status: "ready", playId: next.playId, view: next.view, showIntro: false });
      setNotice({ tone: "info", text: describe(next.view) });
      // The refuting clue lights up; on a phone the board scrolls to it (desktop draws a red string).
      const refuting = next.view.hypotheses.find((h) => changed.hypotheses.has(h.id))?.refutedByClueId;
      if (refuting && !changed.ended) {
        flash(refuting);
        if (!window.matchMedia("(min-width: 1024px)").matches) {
          requestAnimationFrame(() => document.getElementById(`clue-${refuting}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
        }
      }
      // The streak, rank and today's result change when a case ends.
      if (changed.ended) {
        void refreshMe();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      if (error instanceof ApiError && (error.code === "conflict" || error.code === "game_over")) {
        const freshPlay = await api.getPlay(playId).catch(() => null);
        if (freshPlay) setLoad({ status: "ready", playId: freshPlay.playId, view: freshPlay.view, showIntro: false });
      }
      setNotice({ tone: "error", text: messageOf(error) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-3xl">
        <p className="font-typewriter text-sm tracking-widest text-muted uppercase">
          {current.case.kind === "daily" && current.case.number ? `Daily Case #${current.case.number}` : "Case on request"} ·{" "}
          {current.case.category} · {current.case.era}
        </p>
        <h1 className="mt-1 font-display text-2xl leading-snug font-semibold sm:text-4xl">{current.case.title}</h1>
      </header>

      <div className="sticky top-0 z-20 -mx-4 flex items-center justify-between gap-3 border-y border-border bg-desk/95 px-4 py-2 backdrop-blur">
        <Hearts livesLeft={current.livesLeft} justLost={fresh.lifeLost} />
        <ScoreCounter value={current.score} />
      </div>

      <div aria-live="polite">
        {notice && (
          <p className={`paper rounded-card px-3 py-2 text-sm ${notice.tone === "error" ? "text-danger" : ""}`}>{notice.text}</p>
        )}
      </div>

      {ended && <CaseResult view={current} playId={playId} clueNumbers={clueNumbers} promotion={promotion} justEnded={fresh.ended} />}

      {!ended && (
        <div className="flex items-end gap-3">
          <Archivist className="h-14 w-14" />
          <p className="speech-bubble mb-3 max-w-2xl px-4 py-3 text-sm">
            Open sealed files for more evidence (−100 each), then accuse a theory. A wrong guess costs a life and 200 points, and shows
            the clue that rules it out.
          </p>
        </div>
      )}

      <div ref={board} className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-14">
        <section aria-labelledby="evidence-heading" className="flex flex-col gap-4">
          <h2 id="evidence-heading" className="font-typewriter text-xl tracking-wider uppercase">
            Evidence
          </h2>
          {current.clues.map((clue, index) =>
            clue.sealed ? (
              <SealedClue
                key={clue.id}
                clue={clue}
                number={index + 1}
                disabled={pending || ended}
                onOpen={() => void act(() => api.open(playId, clue.id), () => `Clue ${index + 1} opened: −100 points.`)}
              />
            ) : (
              <ClueCard
                key={clue.id}
                clue={clue}
                number={index + 1}
                exhibit={clue.exhibitIndex === null ? null : (current.exhibits[clue.exhibitIndex] ?? null)}
                revealedByMistake={!ended && clue.revealedByMistake}
                fresh={fresh.clues.has(clue.id)}
                highlighted={highlight === clue.id}
              />
            ),
          )}
        </section>

        <section aria-labelledby="theories-heading" className="flex flex-col gap-4">
          <h2 id="theories-heading" className="font-typewriter text-xl tracking-wider uppercase">
            Theories
          </h2>
          <p className="-mt-2 text-sm text-muted">{ended ? "The board as you left it." : "Which explanation is right? Accuse one."}</p>
          <Hypotheses
            hypotheses={current.hypotheses}
            clueNumbers={clueNumbers}
            disabled={pending}
            ended={ended}
            freshIds={fresh.hypotheses}
            onShowClue={flash}
            onAccuse={(hypothesisId) =>
              void act(
                () => api.accuse(playId, hypothesisId),
                (next) =>
                  next.status === "solved"
                    ? "Case solved!"
                    : next.status === "failed"
                      ? "Out of lives. Here is what really happened."
                      : "Not quite: that theory is ruled out. −1 life, −200 points.",
              )
            }
          />
        </section>

        <RedStrings boardRef={board} links={strings} freshIds={fresh.hypotheses} />
      </div>

      <ExhibitGallery exhibits={current.exhibits} />
    </div>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
