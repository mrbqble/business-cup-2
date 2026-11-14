"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/client/api";
import type { PlayerStats } from "@/lib/game/stats";

import { RankBadge } from "./case-result";
import { PaywallSheet } from "./paywall-sheet";
import { Card, ErrorState, Spinner } from "./ui";

type State = { status: "loading" } | { status: "locked" } | { status: "error"; message: string } | { status: "ready"; stats: PlayerStats };

async function loadStats(): Promise<State> {
  try {
    return { status: "ready", stats: (await api.stats()).stats };
  } catch (error) {
    if (error instanceof ApiError && error.code === "plus_required") return { status: "locked" };
    return { status: "error", message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/** Personal stats (Plus): cases finished, solve rate, average score, streaks and rank progress. */
export function StatsPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(true);

  useEffect(() => {
    let active = true;
    void loadStats().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state.status === "loading") return <Spinner label="Loading your stats" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={() => setAttempt((n) => n + 1)} />;
  if (state.status === "locked") {
    return (
      <>
        <Card>
          <p className="text-sm">Your solve rate, average score, best streak and rank progress live here with Plus.</p>
          <button type="button" onClick={() => setSheetOpen(true)} className="mt-3 inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-sm font-semibold text-accent-text">
            See what Plus includes
          </button>
        </Card>
        <PaywallSheet reason="stats" open={sheetOpen} onClose={() => setSheetOpen(false)} />
      </>
    );
  }

  const { stats } = state;
  const tiles: [string, string][] = [
    ["Cases finished", String(stats.finished)],
    ["Solve rate", `${Math.round(stats.solveRate * 100)}%`],
    ["Average score", String(stats.averageScore)],
    ["Current streak", `${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`],
    ["Best streak", `${stats.bestStreak} day${stats.bestStreak === 1 ? "" : "s"}`],
    ["Lifetime points", stats.rank.points.toLocaleString("en-US")],
  ];
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center gap-4">
        <RankBadge level={stats.rank.level} />
        <div>
          <p className="font-typewriter text-xs tracking-widest text-muted uppercase">Rank</p>
          <p className="font-display text-2xl font-semibold">{stats.rank.name}</p>
          <p className="text-sm text-muted">
            {stats.rank.next
              ? `Next: ${stats.rank.next.name} (${[
                  stats.rank.next.casesToGo ? `${stats.rank.next.casesToGo} more case${stats.rank.next.casesToGo === 1 ? "" : "s"}` : null,
                  stats.rank.next.pointsToGo ? `${stats.rank.next.pointsToGo.toLocaleString("en-US")} more points` : null,
                ]
                  .filter(Boolean)
                  .join(", ")})`
              : "The top rank."}
          </p>
        </div>
      </Card>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="paper rounded-card p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <Link href="/archive" className="inline-flex min-h-11 items-center self-start text-sm font-semibold underline">
        Play a case from the archive
      </Link>
    </div>
  );
}
