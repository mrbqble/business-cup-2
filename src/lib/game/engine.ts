import { OPENING_CLUE_COUNT, type CaseContent } from "@/lib/case/schema";

export const STARTING_SCORE = 1000;
export const OPEN_CLUE_COST = 100;
export const WRONG_ACCUSATION_COST = 200;
export const STARTING_LIVES = 3;

export type GameAction = { type: "open"; clueId: string } | { type: "accuse"; hypothesisId: string };
export type GameStatus = "in_progress" | "solved" | "failed";
export type ActionError = "game_over" | "unknown_clue" | "clue_visible" | "unknown_hypothesis" | "already_ruled_out";

export interface WrongAccusation {
  hypothesisId: string;
  /** The clue shown to explain why this hypothesis is wrong. */
  refutingClueId: string | null;
}

export interface GameState {
  status: GameStatus;
  livesLeft: number;
  /** Sealed clues the player paid to open. */
  openedClueIds: string[];
  /** Sealed clues shown for free because a wrong accusation needed explaining. */
  revealedClueIds: string[];
  wrongAccusations: WrongAccusation[];
}

/** The parts of a case the rules need, derived once per case. */
export interface GameRules {
  clueIds: string[];
  openingClueIds: string[];
  hypothesisIds: string[];
  correctHypothesisId: string;
  refutersByHypothesis: Record<string, string[]>;
}

export type ActionResult = { ok: true; state: GameState } | { ok: false; error: ActionError };

export function rulesFor(content: CaseContent): GameRules {
  const correct = content.hypotheses.find((h) => h.correct);
  if (!correct) throw new Error("A playable case needs a correct hypothesis");
  return {
    clueIds: content.clues.map((c) => c.id),
    openingClueIds: content.clues.slice(0, OPENING_CLUE_COUNT).map((c) => c.id),
    hypothesisIds: content.hypotheses.map((h) => h.id),
    correctHypothesisId: correct.id,
    refutersByHypothesis: Object.fromEntries(
      content.hypotheses.map((h) => [h.id, content.clues.filter((c) => c.refutes.includes(h.id)).map((c) => c.id)]),
    ),
  };
}

export function initialState(): GameState {
  return { status: "in_progress", livesLeft: STARTING_LIVES, openedClueIds: [], revealedClueIds: [], wrongAccusations: [] };
}

export function visibleClueIds(rules: GameRules, state: GameState): Set<string> {
  return new Set([...rules.openingClueIds, ...state.openedClueIds, ...state.revealedClueIds]);
}

/** Running score; a failed case scores 0. */
export function scoreOf(state: GameState): number {
  if (state.status === "failed") return 0;
  const penalty = OPEN_CLUE_COST * state.openedClueIds.length + WRONG_ACCUSATION_COST * state.wrongAccusations.length;
  return Math.max(0, STARTING_SCORE - penalty);
}

export function applyAction(rules: GameRules, state: GameState, action: GameAction): ActionResult {
  if (state.status !== "in_progress") return { ok: false, error: "game_over" };
  return action.type === "open" ? open(rules, state, action.clueId) : accuse(rules, state, action.hypothesisId);
}

export function replay(rules: GameRules, actions: readonly GameAction[]): ActionResult {
  let state = initialState();
  for (const action of actions) {
    const result = applyAction(rules, state, action);
    if (!result.ok) return result;
    state = result.state;
  }
  return { ok: true, state };
}

function open(rules: GameRules, state: GameState, clueId: string): ActionResult {
  if (!rules.clueIds.includes(clueId)) return { ok: false, error: "unknown_clue" };
  if (visibleClueIds(rules, state).has(clueId)) return { ok: false, error: "clue_visible" };
  return { ok: true, state: { ...state, openedClueIds: [...state.openedClueIds, clueId] } };
}

function accuse(rules: GameRules, state: GameState, hypothesisId: string): ActionResult {
  if (!rules.hypothesisIds.includes(hypothesisId)) return { ok: false, error: "unknown_hypothesis" };
  if (state.wrongAccusations.some((w) => w.hypothesisId === hypothesisId)) return { ok: false, error: "already_ruled_out" };
  if (hypothesisId === rules.correctHypothesisId) return { ok: true, state: { ...state, status: "solved" } };

  const visible = visibleClueIds(rules, state);
  const refuters = rules.refutersByHypothesis[hypothesisId] ?? [];
  const refutingClueId = refuters.find((id) => !visible.has(id)) ?? refuters[0] ?? null;
  const livesLeft = state.livesLeft - 1;

  return {
    ok: true,
    state: {
      ...state,
      status: livesLeft === 0 ? "failed" : "in_progress",
      livesLeft,
      revealedClueIds:
        refutingClueId && !visible.has(refutingClueId) ? [...state.revealedClueIds, refutingClueId] : state.revealedClueIds,
      wrongAccusations: [...state.wrongAccusations, { hypothesisId, refutingClueId }],
    },
  };
}
