import type { CaseContent } from "./schema";

/**
 * Shuffles the hypotheses and renames every id by position (c1..c8, h1..h4), so neither the
 * order nor the ids the model chose can hint at the answer.
 */
export function finalizeCase(content: CaseContent, random: () => number = Math.random): CaseContent {
  const order = shuffle([...content.hypotheses.keys()], random);
  const hypothesisIds = new Map(order.map((oldIndex, newIndex) => [content.hypotheses[oldIndex].id, `h${newIndex + 1}`]));
  const clueIds = new Map(content.clues.map((clue, index) => [clue.id, `c${index + 1}`]));
  const renameHypotheses = (ids: string[]) => ids.map((id) => hypothesisIds.get(id) ?? id);

  return {
    ...content,
    clues: content.clues.map((clue) => ({
      ...clue,
      id: clueIds.get(clue.id) ?? clue.id,
      supports: renameHypotheses(clue.supports),
      refutes: renameHypotheses(clue.refutes),
    })),
    hypotheses: order.map((oldIndex, newIndex) => ({ ...content.hypotheses[oldIndex], id: `h${newIndex + 1}` })),
    solution: content.solution.map((sentence) => ({
      ...sentence,
      clueIds: sentence.clueIds.map((id) => clueIds.get(id) ?? id),
    })),
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
