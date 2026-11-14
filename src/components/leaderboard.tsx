"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type LeaderboardEntryView, type LeaderboardResponse } from "@/lib/client/api";

import { ErrorState, Spinner } from "./ui";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; board: LeaderboardResponse };

async function load(slug: string): Promise<State> {
  try {
    return { status: "ready", board: await api.leaderboard(slug) };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

function useLeaderboard(slug: string) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void load(slug).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [slug, attempt]);
  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };
  return { state, retry };
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Row({ entry }: { entry: LeaderboardEntryView }) {
  return (
    <li className={`flex items-center gap-3 rounded-card px-3 py-2 ${entry.isYou ? "bg-accent/15 font-semibold" : ""}`}>
      <span className="w-8 text-right tabular-nums text-muted">#{entry.rank}</span>
      <span aria-hidden>{entry.avatar}</span>
      <span className="flex-1 truncate">
        {entry.nickname}
        {entry.isYou && <span className="ml-1 text-xs text-muted">(you)</span>}
      </span>
      <span className="text-xs text-muted tabular-nums" title="Time to finish">
        {formatDuration(entry.durationMs)}
      </span>
      <span className="w-16 text-right tabular-nums">{entry.solved ? entry.score : "closed"}</span>
    </li>
  );
}

/** Ranked finished plays; your own row stays visible even outside the top entries. */
export function LeaderboardList({ slug, limit }: { slug: string; limit?: number }) {
  const { state, retry } = useLeaderboard(slug);

  if (state.status === "loading") return <Spinner label="Loading the leaderboard" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={retry} />;

  const { entries, you, total } = state.board;
  if (total === 0) return <p className="text-sm text-muted">No one has finished this case yet. Be the first.</p>;
  const shown = limit ? entries.slice(0, limit) : entries;
  const youShown = you && shown.some((e) => e.isYou);

  return (
    <div>
      <ol className="flex flex-col gap-1 text-sm">
        {shown.map((entry) => (
          <Row key={`${entry.rank}-${entry.nickname}`} entry={entry} />
        ))}
      </ol>
      {you && !youShown && (
        <ol className="mt-1 border-t border-border pt-1 text-sm">
          <Row entry={you} />
        </ol>
      )}
      <p className="mt-2 text-xs text-muted">
        {total} {total === 1 ? "player has" : "players have"} finished this case. Ties go to the faster solve.
      </p>
    </div>
  );
}

export function LeaderboardPreview({ slug }: { slug: string }) {
  return (
    <div className="mt-5">
      <h3 className="font-semibold">Today&apos;s leaderboard</h3>
      <div className="mt-2">
        <LeaderboardList slug={slug} limit={5} />
      </div>
      <Link href={`/case/${slug}/leaderboard`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline">
        See the full leaderboard
      </Link>
    </div>
  );
}
