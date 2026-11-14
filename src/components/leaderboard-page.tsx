"use client";

import Link from "next/link";
import { use } from "react";

import { LeaderboardList } from "./leaderboard";

export function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Leaderboard</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">Top investigators</h1>
        <p className="mt-1 text-sm text-muted">Scores are computed on the server from each player&apos;s moves, so the board is fair.</p>
      </div>
      <LeaderboardList slug={slug} />
      <Link href={`/case/${slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold underline">
        Back to the case
      </Link>
    </div>
  );
}
