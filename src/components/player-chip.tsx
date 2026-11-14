"use client";

import { useMe } from "@/lib/client/me";

import { RankBadge } from "./case-result";

/** Who you are on this device, your detective rank and your streak. Nothing to sign up for. */
export function PlayerChip() {
  const state = useMe();
  if (state.status !== "ready") return <span className="text-xs text-muted">Real mysteries. Verified quotes.</span>;

  const { player, streak, rank } = state.me;
  return (
    <span
      className="flex items-center gap-2 text-sm"
      aria-label={`Playing as ${player.nickname}, rank ${rank.name}, ${streak}-day streak`}
    >
      <span aria-hidden className="hidden text-lg sm:inline">
        {player.avatar}
      </span>
      <span className="hidden font-semibold sm:inline">{player.nickname}</span>
      <span key={rank.name} className="animate-pop-in flex items-center gap-1.5" title={`Detective rank: ${rank.name}`}>
        <RankBadge level={rank.level} small />
        <span className="font-typewriter text-[0.7rem] uppercase sm:text-xs sm:tracking-wider">{rank.name}</span>
      </span>
      <span className="flex items-center gap-1 rounded-full bg-desk-text/10 px-2 py-0.5 text-xs font-semibold" title="Days in a row you finished the daily case">
        <span aria-hidden className={streak > 0 ? "animate-flicker" : "opacity-50 grayscale"}>
          🔥
        </span>
        {streak}
      </span>
    </span>
  );
}
