import { rankFor, type Rank } from "./rank";
import { currentStreak, previousDateKey } from "./streak";

export interface PlayerStats {
  finished: number;
  solved: number;
  /** Share of finished cases solved, 0 to 1. */
  solveRate: number;
  /** Mean final score over finished cases (a case lost on lives scores 0). */
  averageScore: number;
  currentStreak: number;
  bestStreak: number;
  rank: Rank;
}

/** Longest run of consecutive New York days with a finished daily case. */
export function bestStreak(finishedDays: Iterable<string>): number {
  const days = new Set(finishedDays);
  let best = 0;
  for (const day of days) {
    if (days.has(previousDateKey(day))) continue;
    let length = 0;
    let cursor = day;
    while (days.has(cursor)) {
      length += 1;
      const next = new Date(`${cursor}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      cursor = next.toISOString().slice(0, 10);
    }
    best = Math.max(best, length);
  }
  return best;
}

export function playerStats(
  summary: { finished: number; solved: number; points: number },
  finishedDays: string[],
  today: string,
): PlayerStats {
  const { finished, solved, points } = summary;
  return {
    finished,
    solved,
    solveRate: finished === 0 ? 0 : solved / finished,
    averageScore: finished === 0 ? 0 : Math.round(points / finished),
    currentStreak: currentStreak(finishedDays, today),
    bestStreak: bestStreak(finishedDays),
    rank: rankFor({ cases: finished, points }),
  };
}
