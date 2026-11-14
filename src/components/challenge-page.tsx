"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import type { ChallengeResult, ChallengeView } from "@/lib/challenge/view";
import { api, ApiError } from "@/lib/client/api";
import { formatDuration } from "@/lib/client/format";

import { ExhibitImage } from "./exhibits";
import { Button, Card, ErrorState, Spinner } from "./ui";

type State = { status: "loading" } | { status: "error"; message: string; notFound: boolean } | { status: "ready"; view: ChallengeView };

async function loadChallenge(slug: string): Promise<State> {
  try {
    return { status: "ready", view: (await api.challenge(slug)).challenge };
  } catch (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return { status: "error", notFound, message: notFound ? "We couldn't find this challenge." : error instanceof Error ? error.message : "Something went wrong." };
  }
}

/** The challenge link: take the case, then compare. Results stay sealed until the viewer finishes. */
export function ChallengePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadChallenge(slug).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  if (state.status === "loading") return <Spinner label="Opening the challenge" />;
  if (state.status === "error") {
    return (
      <ErrorState message={state.message} onRetry={state.notFound ? undefined : () => setAttempt((n) => n + 1)}>
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
          Play today&apos;s case
        </Link>
      </ErrorState>
    );
  }

  const { view } = state;
  const caseLabel = view.case.kind === "daily" && view.case.number ? `Daily Case #${view.case.number}` : "A Daily Case";

  async function take() {
    setJoining(true);
    setJoinError(null);
    try {
      const { caseSlug } = await api.joinChallenge(slug);
      router.push(`/case/${caseSlug}?challenge=${encodeURIComponent(slug)}`);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {view.case.cover && (
          <figure className="w-full shrink-0 -rotate-1 bg-white p-2 shadow-md sm:w-56">
            <ExhibitImage exhibit={view.case.cover} eager />
          </figure>
        )}
        <div>
          <p className="font-typewriter text-sm tracking-widest text-muted uppercase">
            Challenge · {caseLabel}
          </p>
          <h1 className="mt-1 font-display text-2xl leading-snug font-semibold sm:text-3xl">
            {view.you.isChallenger ? "Your challenge" : `${view.challenger.avatar} ${view.challenger.nickname} challenges you`}
          </h1>
          <p className="mt-2 font-display text-lg">{view.case.title}</p>
        </div>
      </header>

      {view.comparison && <Comparison you={view.comparison.you} them={view.comparison.them} challenger={view.challenger.nickname} />}

      {!view.you.isChallenger && !view.you.finished && (
        <Card>
          <p className="text-sm">
            Play the same case as your own anonymous player. No sign-up. {view.challenger.nickname}&apos;s result stays sealed until you finish,
            so nothing gets spoiled.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button onClick={() => void take()} disabled={joining}>
              {joining ? "Opening the case…" : view.you.joined ? "Continue the case" : "Take the challenge"}
            </Button>
          </div>
          {joinError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {joinError}
            </p>
          )}
        </Card>
      )}

      {view.you.finished && (
        <Card>
          <p className="font-semibold">Rematch?</p>
          <p className="mt-1 text-sm text-muted">A new daily case opens at midnight New York time. Play it, then send a fresh challenge.</p>
          <Link href="/" className="mt-3 inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-sm font-semibold text-accent-text">
            Today&apos;s case
          </Link>
        </Card>
      )}

      <section aria-labelledby="takers-heading" className="flex flex-col gap-2">
        <h2 id="takers-heading" className="font-typewriter text-lg tracking-wider uppercase">
          Who took this challenge
        </h2>
        {!view.resultsVisible && <p className="text-sm text-muted">Scores unlock when you finish the case.</p>}
        <ol className="paper flex flex-col rounded-card p-2">
          {view.entries.map((entry) => (
            <li key={`${entry.nickname}-${entry.isYou}-${entry.isChallenger}`} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card px-3 py-2 ${entry.isYou ? "bg-accent/15" : ""}`}>
              <span className="w-8 text-right text-sm text-muted tabular-nums">{entry.rank ? `#${entry.rank}` : ""}</span>
              <span aria-hidden>{entry.avatar}</span>
              <span className="font-semibold">
                {entry.nickname}
                {entry.isYou && <span className="ml-1 text-xs text-muted">(you)</span>}
                {entry.isChallenger && <span className="ml-1 text-xs text-muted">(challenger)</span>}
              </span>
              <span className="ml-auto text-sm">
                {entry.result ? (
                  <>
                    <span className="mr-2 font-mono">{entry.result.grid}</span>
                    <span className="font-semibold tabular-nums">{entry.result.solved ? entry.result.score : "closed"}</span>
                  </>
                ) : (
                  <span className="text-muted">{entry.finished ? "finished" : "playing"}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
        {view.total > view.entries.length && <p className="text-xs text-muted">Showing {view.entries.length} of {view.total} players.</p>}
      </section>
    </div>
  );
}

function Comparison({ you, them, challenger }: { you: ChallengeResult; them: ChallengeResult; challenger: string }) {
  const verdict =
    you.score === them.score
      ? you.durationMs < them.durationMs
        ? "Same score, and you were faster."
        : you.durationMs > them.durationMs
          ? `Same score, but ${challenger} was faster.`
          : "A perfect tie."
      : you.score > them.score
        ? `You beat ${challenger} by ${you.score - them.score} points.`
        : `${challenger} wins by ${them.score - you.score} points.`;
  const rows: [string, (r: ChallengeResult) => string][] = [
    ["Result", (r) => (r.solved ? "Solved" : "Cold case")],
    ["Score", (r) => String(r.score)],
    ["Clues opened", (r) => String(r.openedClues)],
    ["Wrong accusations", (r) => String(r.wrongAccusations)],
    ["Time", (r) => formatDuration(r.durationMs)],
    ["Grid", (r) => r.grid],
  ];
  return (
    <Card aria-labelledby="comparison-heading">
      <h2 id="comparison-heading" className="font-display text-xl font-semibold">
        {verdict}
      </h2>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th scope="col" className="py-1 font-normal" />
            <th scope="col" className="py-1">You</th>
            <th scope="col" className="py-1">{challenger}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-t border-border">
              <th scope="row" className="py-2 pr-2 text-left font-normal text-muted">
                {label}
              </th>
              <td className="py-2 pr-2 font-semibold tabular-nums">{value(you)}</td>
              <td className="py-2 font-semibold tabular-nums">{value(them)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
