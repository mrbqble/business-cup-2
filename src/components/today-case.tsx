"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { CaseSummary } from "@/lib/case/view";
import { api, ApiError } from "@/lib/client/api";
import { useMe } from "@/lib/client/me";

import { ExhibitCredit, ExhibitImage } from "./exhibits";
import { Card, ErrorState, Spinner } from "./ui";

type State =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; summary: CaseSummary };

async function loadToday(): Promise<State> {
  try {
    const { view } = await api.today();
    return { status: "ready", summary: view.case };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404)
      return { status: "empty" };
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

export function TodayCase() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const me = useMe();

  useEffect(() => {
    let active = true;
    void loadToday().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  if (state.status === "loading") {
    return (
      <Card aria-busy>
        <Spinner label="Loading today's case" />
      </Card>
    );
  }
  if (state.status === "error")
    return <ErrorState message={state.message} onRetry={retry} />;
  if (state.status === "empty") {
    return (
      <Card>
        <p className="text-sm text-muted">
          Today&apos;s case is still being written. Open a case on any topic
          below in the meantime.
        </p>
      </Card>
    );
  }

  const { summary } = state;
  const mine =
    me.status === "ready" && me.me.today?.slug === summary.slug
      ? me.me.today
      : null;
  const finished = mine?.status === "solved" || mine?.status === "failed";
  return (
    <Card
      aria-labelledby="today-heading"
      className="sm:flex sm:items-start sm:gap-5"
    >
      {summary.cover && (
        <figure className="mb-4 shrink-0 rotate-1 bg-white p-2 pb-2.5 shadow-md sm:order-2 sm:mb-0 sm:w-52">
          <ExhibitImage exhibit={summary.cover} eager />
          <figcaption className="mt-1 text-[0.6rem] leading-tight text-muted">
            <ExhibitCredit exhibit={summary.cover} />
          </figcaption>
        </figure>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-typewriter text-xs tracking-wide text-muted uppercase">
          {summary.number ? `Daily Case #${summary.number}` : "Today's case"} ·{" "}
          {summary.category} · {summary.era}
        </p>
        <h2
          id="today-heading"
          className="mt-2 font-display text-2xl leading-snug font-semibold"
        >
          {summary.title}
        </h2>
        {finished && (
          <p className="mt-2 text-sm font-semibold">
            {mine.status === "solved"
              ? `You solved it with ${mine.score} points.`
              : "You closed this case. Come back tomorrow for the next one."}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/case/${summary.slug}`}
            className="inline-flex min-h-11 items-center rounded-card bg-accent px-4 py-2 text-sm font-semibold text-accent-text hover:opacity-90"
          >
            {finished
              ? "Review the case"
              : mine?.status === "in_progress"
                ? "Continue the investigation"
                : "Start the investigation"}
          </Link>
          <Link
            href={`/case/${summary.slug}/leaderboard`}
            className="inline-flex min-h-11 items-center text-sm font-semibold underline"
          >
            Today&apos;s leaderboard
          </Link>
        </div>
      </div>
    </Card>
  );
}
