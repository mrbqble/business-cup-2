"use client";

import { useMe } from "@/lib/client/me";

/** Who you are on this device, and your streak. Nothing to sign up for. */
export function PlayerChip() {
  const state = useMe();
  if (state.status !== "ready") return <span className="text-xs text-muted">Real mysteries. Verified quotes.</span>;

  const { player, streak } = state.me;
  return (
    <span className="flex items-center gap-2 text-sm" aria-label={`Playing as ${player.nickname}, ${streak}-day streak`}>
      <span aria-hidden className="text-lg">
        {player.avatar}
      </span>
      <span className="hidden font-semibold sm:inline">{player.nickname}</span>
      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold" title="Days in a row you finished the daily case">
        🔥 {streak}
      </span>
    </span>
  );
}
