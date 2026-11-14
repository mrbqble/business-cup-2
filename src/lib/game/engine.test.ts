import { describe, expect, it } from "vitest";

import { sampleCase } from "@/lib/case/__fixtures__/sample-case";

import { applyAction, initialState, replay, rulesFor, scoreOf, visibleClueIds, type GameAction } from "./engine";

const rules = rulesFor(sampleCase());
const open = (clueId: string): GameAction => ({ type: "open", clueId });
const accuse = (hypothesisId: string): GameAction => ({ type: "accuse", hypothesisId });

function play(...actions: GameAction[]) {
  const result = replay(rules, actions);
  if (!result.ok) throw new Error(`replay failed: ${result.error}`);
  return result.state;
}

describe("game engine", () => {
  it("starts with 3 lives, 1000 points and only the opening clues visible", () => {
    const state = initialState();
    expect(state.livesLeft).toBe(3);
    expect(scoreOf(state)).toBe(1000);
    expect([...visibleClueIds(rules, state)]).toEqual(["c1", "c2"]);
  });

  it("charges 100 points per opened sealed clue", () => {
    const state = play(open("c3"), open("c6"));
    expect(scoreOf(state)).toBe(800);
    expect(visibleClueIds(rules, state)).toEqual(new Set(["c1", "c2", "c3", "c6"]));
  });

  it("solves the case on the correct accusation", () => {
    const state = play(open("c3"), accuse("h1"));
    expect(state.status).toBe("solved");
    expect(scoreOf(state)).toBe(900);
  });

  it("on a wrong accusation costs a life and 200 points and reveals a refuting clue for free", () => {
    const state = play(accuse("h2"));
    expect(state.livesLeft).toBe(2);
    expect(scoreOf(state)).toBe(800);
    expect(state.wrongAccusations).toEqual([{ hypothesisId: "h2", refutingClueId: "c3" }]);
    expect(state.revealedClueIds).toEqual(["c3"]);
  });

  it("explains a wrong accusation with a clue the player has not seen yet when one exists", () => {
    const state = play(open("c3"), accuse("h2"));
    expect(state.wrongAccusations[0].refutingClueId).toBe("c4");
  });

  it("reuses an already visible refuting clue when no unseen one is left", () => {
    const state = play(open("c7"), accuse("h4"));
    expect(state.wrongAccusations[0].refutingClueId).toBe("c7");
    expect(state.revealedClueIds).toEqual([]);
  });

  it("fails the case with a score of 0 when the last life is lost", () => {
    const state = play(accuse("h2"), accuse("h3"), accuse("h4"));
    expect(state.status).toBe("failed");
    expect(state.livesLeft).toBe(0);
    expect(scoreOf(state)).toBe(0);
  });

  it("never lets the score drop below 0", () => {
    const state = play(open("c3"), open("c4"), open("c5"), open("c6"), open("c7"), open("c8"), accuse("h2"), accuse("h3"));
    expect(state.status).toBe("in_progress");
    expect(scoreOf(state)).toBe(0);
  });

  it.each([
    ["an unknown clue", [open("c99")], "unknown_clue"],
    ["an opening clue", [open("c1")], "clue_visible"],
    ["a clue opened twice", [open("c3"), open("c3")], "clue_visible"],
    ["a clue already revealed by a wrong accusation", [accuse("h2"), open("c3")], "clue_visible"],
    ["an unknown hypothesis", [accuse("h9")], "unknown_hypothesis"],
    ["a hypothesis already ruled out", [accuse("h2"), accuse("h2")], "already_ruled_out"],
    ["any action after the case is solved", [accuse("h1"), open("c3")], "game_over"],
    ["any action after the case is failed", [accuse("h2"), accuse("h3"), accuse("h4"), accuse("h1")], "game_over"],
  ] as const)("rejects %s", (_, actions, error) => {
    expect(replay(rules, actions)).toEqual({ ok: false, error });
  });

  it("does not change the state it was given", () => {
    const state = initialState();
    applyAction(rules, state, open("c3"));
    expect(state).toEqual(initialState());
  });
});
