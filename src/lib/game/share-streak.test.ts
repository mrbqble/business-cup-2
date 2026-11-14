import { describe, expect, it } from "vitest";

import { sampleCase } from "@/lib/case/__fixtures__/sample-case";

import { replay, rulesFor, type GameAction } from "./engine";
import { shareGrid } from "./share";
import { currentStreak, previousDateKey } from "./streak";

const rules = rulesFor(sampleCase());

function grid(...actions: GameAction[]) {
  const result = replay(rules, actions);
  if (!result.ok) throw new Error(result.error);
  return shareGrid(rules, result.state);
}

describe("shareGrid", () => {
  it("marks opened sealed clues and lists accusations in order", () => {
    expect(grid({ type: "open", clueId: "c3" }, { type: "open", clueId: "c5" }, { type: "accuse", hypothesisId: "h2" }, { type: "accuse", hypothesisId: "h1" })).toBe(
      "🔎⬛🔎⬛⬛⬛ ❌✅",
    );
  });

  it("does not count clues revealed by a wrong accusation as opened", () => {
    expect(grid({ type: "accuse", hypothesisId: "h2" })).toBe("⬛⬛⬛⬛⬛⬛ ❌");
  });

  it("shows three crosses and no check for a failed case", () => {
    expect(grid({ type: "accuse", hypothesisId: "h2" }, { type: "accuse", hypothesisId: "h3" }, { type: "accuse", hypothesisId: "h4" })).toBe(
      "⬛⬛⬛⬛⬛⬛ ❌❌❌",
    );
  });

  it("never contains a hypothesis or clue id", () => {
    expect(grid({ type: "open", clueId: "c4" }, { type: "accuse", hypothesisId: "h1" })).not.toMatch(/[ch]\d/);
  });
});

describe("currentStreak", () => {
  it("counts consecutive days ending today", () => {
    expect(currentStreak(["2026-11-13", "2026-11-14", "2026-11-15"], "2026-11-15")).toBe(3);
  });

  it("keeps a streak that ended yesterday alive until today's case is missed", () => {
    expect(currentStreak(["2026-11-13", "2026-11-14"], "2026-11-15")).toBe(2);
  });

  it("stops at the first missed day", () => {
    expect(currentStreak(["2026-11-11", "2026-11-13", "2026-11-14"], "2026-11-14")).toBe(2);
    expect(currentStreak(["2026-11-12"], "2026-11-15")).toBe(0);
    expect(currentStreak([], "2026-11-15")).toBe(0);
  });

  it("crosses month and year boundaries", () => {
    expect(previousDateKey("2026-12-01")).toBe("2026-11-30");
    expect(previousDateKey("2027-01-01")).toBe("2026-12-31");
    expect(currentStreak(["2026-11-30", "2026-12-01"], "2026-12-01")).toBe(2);
  });
});
