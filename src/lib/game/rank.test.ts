import { describe, expect, it } from "vitest";

import { rankFor } from "./rank";

describe("rankFor", () => {
  it("starts every player as a Rookie with the first case to go", () => {
    expect(rankFor({ cases: 0, points: 0 })).toEqual({
      name: "Rookie",
      level: 1,
      cases: 0,
      points: 0,
      next: { name: "Investigator", casesToGo: 1, pointsToGo: 0 },
    });
  });

  it("promotes after the first finished case, even one lost on lives", () => {
    expect(rankFor({ cases: 1, points: 0 })).toMatchObject({ name: "Investigator", level: 2 });
  });

  it("needs both the cases and the points for a rank", () => {
    expect(rankFor({ cases: 5, points: 1_400 })).toMatchObject({
      name: "Investigator",
      next: { name: "Detective", casesToGo: 0, pointsToGo: 100 },
    });
    expect(rankFor({ cases: 2, points: 2_000 })).toMatchObject({ name: "Investigator", next: { casesToGo: 1, pointsToGo: 0 } });
    expect(rankFor({ cases: 3, points: 1_500 })).toMatchObject({ name: "Detective", level: 3 });
    expect(rankFor({ cases: 7, points: 4_000 })).toMatchObject({ name: "Inspector", level: 4 });
  });

  it("tops out at Chief", () => {
    expect(rankFor({ cases: 40, points: 30_000 })).toMatchObject({ name: "Chief", level: 5, next: null });
  });

  it("treats bad totals as zero", () => {
    expect(rankFor({ cases: -3, points: Number.NaN })).toMatchObject({ name: "Rookie", cases: 0 });
  });
});
