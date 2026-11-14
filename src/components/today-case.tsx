"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { CaseSummary } from "@/lib/case/view";
import { api, ApiError } from "@/lib/client/api";

import { Card, ErrorState, Spinner } from "./ui";

type State = { status: "loading" } | { status: "empty" } | { status: "error"; message: string } | { status: "ready"; summary: CaseSummary };

async function loadToday(): Promise<State> {
  try {
    const { view } = await api.today();
    return { status: "ready", summary: view.case };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { status: "empty" };
    return { status: "error", message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export function TodayCase() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

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
  if (state.status === "error") return <ErrorState message={state.message} onRetry={retry} />;
  if (state.status === "empty") {
    return (
      <Card>
        <p className="text-sm text-muted">Today&apos;s case is still being written. Open a case on any topic below in the meantime.</p>
      </Card>
    );
  }

  const { summary } = state;
  return (
    <Card aria-labelledby="today-heading">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        {summary.number ? `Daily Case #${summary.number}` : "Today's case"} · {summary.category} · {summary.era}
      </p>
      <h2 id="today-heading" className="mt-2 font-display text-2xl leading-snug font-semibold">
        {summary.title}
      </h2>
      <Link
        href={`/case/${summary.slug}`}
        className="mt-4 inline-flex min-h-11 items-center rounded-card bg-accent px-4 py-2 text-sm font-semibold text-accent-text hover:opacity-90"
      >
        Start the investigation
      </Link>
    </Card>
  );
}
