import { describe, expect, it } from "vitest";

import { bestStreak, playerStats } from "./stats";

describe("bestStreak", () => {
  it("finds the longest run of consecutive days, across month ends", () => {
    expect(bestStreak([])).toBe(0);
    expect(bestStreak(["2026-11-14"])).toBe(1);
    expect(bestStreak(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-05", "2026-11-06"])).toBe(3);
    expect(bestStreak(["2026-11-06", "2026-11-05", "2026-11-05"])).toBe(2);
  });
});

describe("playerStats", () => {
  it("summarizes finished cases, solve rate, average score, streaks and rank", () => {
    const stats = playerStats({ finished: 4, solved: 3, points: 2_400 }, ["2026-11-13", "2026-11-14", "2026-11-10"], "2026-11-15");
    expect(stats).toMatchObject({ finished: 4, solved: 3, solveRate: 0.75, averageScore: 600, currentStreak: 2, bestStreak: 2 });
    expect(stats.rank.name).toBe("Detective");
  });

  it("reports zeros before the first case", () => {
    expect(playerStats({ finished: 0, solved: 0, points: 0 }, [], "2026-11-15")).toMatchObject({ solveRate: 0, averageScore: 0, bestStreak: 0 });
  });
});
