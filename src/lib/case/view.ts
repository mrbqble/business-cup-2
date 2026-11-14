import { rulesFor, scoreOf, visibleClueIds, type GameState, type GameStatus } from "@/lib/game/engine";
import { shareGrid } from "@/lib/game/share";

import type { CaseCategory, CaseKind, CaseRecord, ClueKind } from "./schema";

export interface CaseSummary {
  slug: string;
  number: number | null;
  kind: CaseKind;
  dateKey: string | null;
  title: string;
  category: CaseCategory;
  era: string;
}

export interface OpenClueView {
  id: string;
  kind: ClueKind;
  sealed: false;
  headline: string;
  body: string;
  quote: string;
  source: { title: string; url: string };
}

export interface SealedClueView {
  id: string;
  kind: ClueKind;
  sealed: true;
}

export type ClueView = OpenClueView | SealedClueView;

export interface HypothesisView {
  id: string;
  text: string;
  status: "open" | "ruled_out" | "correct";
  /** For a ruled-out hypothesis: the clue that shows why. */
  refutedByClueId: string | null;
}

export interface ResultView {
  /** Spoiler-free result grid for sharing, e.g. "🔎🔎⬛⬛⬛⬛ ❌✅". */
  grid: string;
  correctHypothesisId: string;
  solution: { text: string; clueIds: string[] }[];
  sources: { title: string; url: string; revisionId: number }[];
  learned: string[];
}

export interface PlayView {
  case: CaseSummary;
  status: GameStatus;
  score: number;
  livesLeft: number;
  clues: ClueView[];
  hypotheses: HypothesisView[];
  /** Only once the play has ended: the answer, solution, sources and what was learned. */
  result: ResultView | null;
}

export function summarize(record: CaseRecord): CaseSummary {
  const { slug, number, kind, dateKey, content } = record;
  return { slug, number, kind, dateKey, title: content.title, category: content.category, era: content.era };
}

/**
 * The only shape a client ever receives. Sealed clues carry no text, and correctness appears
 * only for hypotheses already ruled out, until the play ends.
 */
export function buildPlayView(record: CaseRecord, state: GameState): PlayView {
  const rules = rulesFor(record.content);
  const visible = visibleClueIds(rules, state);
  const sourcesById = new Map(record.sources.map((s) => [s.id, s]));
  const ended = state.status !== "in_progress";

  const clues: ClueView[] = record.content.clues.map((clue) => {
    if (!visible.has(clue.id) && !ended) return { id: clue.id, kind: clue.kind, sealed: true };
    const source = sourcesById.get(clue.sourceId);
    return {
      id: clue.id,
      kind: clue.kind,
      sealed: false,
      headline: clue.headline,
      body: clue.body,
      quote: clue.quote,
      source: { title: source?.title ?? "", url: source?.url ?? "" },
    };
  });

  const hypotheses: HypothesisView[] = record.content.hypotheses.map((h) => {
    const wrong = state.wrongAccusations.find((w) => w.hypothesisId === h.id);
    if (wrong) return { id: h.id, text: h.text, status: "ruled_out", refutedByClueId: wrong.refutingClueId };
    if (ended && h.id === rules.correctHypothesisId) return { id: h.id, text: h.text, status: "correct", refutedByClueId: null };
    return { id: h.id, text: h.text, status: "open", refutedByClueId: null };
  });

  return {
    case: summarize(record),
    status: state.status,
    score: scoreOf(state),
    livesLeft: state.livesLeft,
    clues,
    hypotheses,
    result: ended
      ? {
          grid: shareGrid(rules, state),
          correctHypothesisId: rules.correctHypothesisId,
          solution: record.content.solution,
          sources: record.sources.map(({ title, url, revisionId }) => ({ title, url, revisionId })),
          learned: record.content.learned,
        }
      : null,
  };
}
