"use client";

import Link from "next/link";

import { useMe } from "@/lib/client/me";

import { RankBadge } from "./case-result";

/** The returning player's record on the home page: rank, streak and what the next rank needs. */
export function PlayerRecord() {
  const me = useMe();
  if (me.status !== "ready") return null;
  const { rank, streak, plan } = me.me;
  const next = rank.next
    ? [
        rank.next.casesToGo > 0 ? `${rank.next.casesToGo} more case${rank.next.casesToGo === 1 ? "" : "s"}` : null,
        rank.next.pointsToGo > 0 ? `${rank.next.pointsToGo.toLocaleString("en-US")} more points` : null,
      ]
        .filter(Boolean)
        .join(" and ")
    : null;

  return (
    <section aria-label="Your detective record" className="paper flex items-center gap-4 rounded-card p-4">
      <RankBadge level={rank.level} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-display text-lg font-semibold">
          {rank.name}
          <span className="ml-2 font-sans text-sm font-normal text-muted">
            <span aria-hidden>🔥</span> {streak}-day streak
          </span>
        </p>
        <p className="text-muted">
          {next ? `${next} to ${rank.next!.name}.` : "The top rank."} Finish today&apos;s case to keep your streak.
        </p>
      </div>
      {plan.plan !== "free" && (
        <Link href="/stats" className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold underline">
          Your stats
        </Link>
      )}
    </section>
  );
}
