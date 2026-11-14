"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import type { PlayView } from "@/lib/case/view";
import { api, ApiError, type PlayResponse } from "@/lib/client/api";
import { refreshMe } from "@/lib/client/me";

import { CaseResult } from "./case-result";
import { ClueCard, SealedClue } from "./clue-card";
import { Hypotheses } from "./hypotheses";
import { Card, ErrorState, Spinner } from "./ui";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string; notFound: boolean }
  | { status: "ready"; playId: string; view: PlayView };

type Notice = { tone: "info" | "error"; text: string };

/** Starts this player's play of the case; the server resumes the existing play when there is one. */
async function resumeOrStart(slug: string): Promise<Load> {
  try {
    const started = await api.startPlay(slug);
    return { status: "ready", ...started };
  } catch (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return { status: "error", notFound, message: notFound ? "We couldn't find this case." : messageOf(error) };
  }
}

export function CasePlayer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;
    void resumeOrStart(slug).then((next) => {
      if (active) setLoad(next);
    });
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  const clueNumbers = useMemo(
    () => new Map(load.status === "ready" ? load.view.clues.map((c, i) => [c.id, i + 1] as const) : []),
    [load],
  );

  const retry = () => {
    setLoad({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  if (load.status === "loading") return <Spinner label="Opening the case file" />;
  if (load.status === "error") {
    return (
      <ErrorState message={load.message} onRetry={load.notFound ? undefined : retry}>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
          Go to today&apos;s case
        </Link>
      </ErrorState>
    );
  }

  const { playId, view } = load;
  const ended = view.status !== "in_progress";

  async function act(run: () => Promise<PlayResponse>, describe: (next: PlayView) => string) {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      const next = await run();
      setLoad({ status: "ready", ...next });
      setNotice({ tone: "info", text: describe(next.view) });
      // The streak and today's result change when a case ends.
      if (next.view.status !== "in_progress") void refreshMe();
    } catch (error) {
      if (error instanceof ApiError && (error.code === "conflict" || error.code === "game_over")) {
        const fresh = await api.getPlay(playId).catch(() => null);
        if (fresh) setLoad({ status: "ready", ...fresh });
      }
      setNotice({ tone: "error", text: messageOf(error) });
    } finally {
      setPending(false);
    }
  }

  const revealed = new Set(view.hypotheses.flatMap((h) => (h.refutedByClueId ? [h.refutedByClueId] : [])));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          {view.case.kind === "daily" && view.case.number ? `Daily Case #${view.case.number}` : "Case on request"} · {view.case.category} ·{" "}
          {view.case.era}
        </p>
        <h1 className="mt-1 font-display text-2xl leading-snug font-semibold sm:text-3xl">{view.case.title}</h1>
      </header>

      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-y border-border bg-bg/95 px-4 py-2 backdrop-blur">
        <p aria-label={`${view.livesLeft} of 3 lives left`} className="text-lg tracking-widest text-danger">
          {"♥".repeat(view.livesLeft)}
          <span className="text-border">{"♥".repeat(3 - view.livesLeft)}</span>
        </p>
        <p className="font-semibold tabular-nums">{view.score} points</p>
      </div>

      <div aria-live="polite">
        {notice && (
          <p className={`rounded-card px-3 py-2 text-sm ${notice.tone === "error" ? "bg-danger-surface text-danger" : "bg-surface-muted"}`}>
            {notice.text}
          </p>
        )}
      </div>

      {ended && <CaseResult view={view} playId={playId} clueNumbers={clueNumbers} />}

      {!ended && (
        <Card>
          <p className="text-sm text-muted">
            Read the evidence, open sealed clues when you need more (−100 points each), then accuse the explanation you believe. A wrong
            accusation costs a life and 200 points and shows you the clue that rules it out.
          </p>
        </Card>
      )}

      <section aria-labelledby="evidence-heading" className="flex flex-col gap-3">
        <h2 id="evidence-heading" className="font-display text-xl font-semibold">
          Evidence
        </h2>
        {view.clues.map((clue, index) =>
          clue.sealed ? (
            <SealedClue
              key={clue.id}
              clue={clue}
              number={index + 1}
              disabled={pending || ended}
              onOpen={() => void act(() => api.open(playId, clue.id), () => `Clue ${index + 1} opened: −100 points.`)}
            />
          ) : (
            <ClueCard key={clue.id} clue={clue} number={index + 1} revealedByMistake={!ended && revealed.has(clue.id)} />
          ),
        )}
      </section>

      <section aria-labelledby="theories-heading" className="flex flex-col gap-3">
        <h2 id="theories-heading" className="font-display text-xl font-semibold">
          Which explanation is right?
        </h2>
        <Hypotheses
          hypotheses={view.hypotheses}
          clueNumbers={clueNumbers}
          disabled={pending}
          ended={ended}
          onAccuse={(hypothesisId) =>
            void act(
              () => api.accuse(playId, hypothesisId),
              (next) =>
                next.status === "solved"
                  ? "Case solved!"
                  : next.status === "failed"
                    ? "Out of lives. Here is what really happened."
                    : "Not quite: that explanation is ruled out. −1 life, −200 points.",
            )
          }
        />
      </section>
    </div>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
