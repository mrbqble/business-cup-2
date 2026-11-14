import type { GameRules, GameState } from "./engine";

/**
 * Spoiler-free result grid: one square per sealed clue (🔎 opened by the player, ⬛ not opened),
 * then the accusations in order (❌ wrong, ✅ right).
 */
export function shareGrid(rules: GameRules, state: GameState): string {
  const opened = new Set(state.openedClueIds);
  const clues = rules.clueIds
    .filter((id) => !rules.openingClueIds.includes(id))
    .map((id) => (opened.has(id) ? "🔎" : "⬛"))
    .join("");
  const accusations = state.wrongAccusations.map(() => "❌").join("") + (state.status === "solved" ? "✅" : "");
  return accusations ? `${clues} ${accusations}` : clues;
}
