import { rulesFor, scoreOf, visibleClueIds, type GameState, type GameStatus } from "@/lib/game/engine";
import { shareGrid } from "@/lib/game/share";
import { significantWords, type Exhibit } from "@/lib/sources/exhibits";

import { fallbackNarration } from "./narration";
import type { CaseCategory, CaseKind, CaseRecord, ClueKind } from "./schema";

export interface CaseSummary {
  slug: string;
  number: number | null;
  kind: CaseKind;
  dateKey: string | null;
  title: string;
  category: CaseCategory;
  era: string;
  /** The primary source's lead image, when it has a free one. */
  cover: Exhibit | null;
}

export interface OpenClueView {
  id: string;
  kind: ClueKind;
  sealed: false;
  headline: string;
  body: string;
  quote: string;
  source: { title: string; url: string };
  /** For an artifact clue: the exhibit whose title shares words with it, shown as its photo. */
  exhibitIndex: number | null;
  /** A sealed clue shown for free because it explains a wrong accusation. */
  revealedByMistake: boolean;
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

/** Comic-panel captions. The closing may state the answer, so it arrives only once the play ends. */
export interface NarrationView {
  setting: string;
  mystery: string;
  task: string;
  closing: string | null;
}

export interface PlayView {
  case: CaseSummary;
  narration: NarrationView;
  /** Real archive images from the sources (Wikimedia Commons), with credits and licenses. */
  exhibits: Exhibit[];
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
  return { slug, number, kind, dateKey, title: content.title, category: content.category, era: content.era, cover: record.exhibits[0] ?? null };
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
      exhibitIndex: clue.kind === "artifact" ? fittingExhibit(`${clue.headline} ${clue.body}`, record.exhibits) : null,
      revealedByMistake: state.revealedClueIds.includes(clue.id),
    };
  });

  const hypotheses: HypothesisView[] = record.content.hypotheses.map((h) => {
    const wrong = state.wrongAccusations.find((w) => w.hypothesisId === h.id);
    if (wrong) return { id: h.id, text: h.text, status: "ruled_out", refutedByClueId: wrong.refutingClueId };
    if (ended && h.id === rules.correctHypothesisId) return { id: h.id, text: h.text, status: "correct", refutedByClueId: null };
    return { id: h.id, text: h.text, status: "open", refutedByClueId: null };
  });

  const narration = record.narration ?? fallbackNarration(record.content);

  return {
    case: summarize(record),
    narration: { setting: narration.setting, mystery: narration.mystery, task: narration.task, closing: ended ? narration.closing : null },
    exhibits: record.exhibits,
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

/** Index of the exhibit sharing the most significant words with the text, or null if none shares any. */
export function fittingExhibit(text: string, exhibits: Exhibit[]): number | null {
  const words = significantWords(text);
  let best: { index: number; shared: number } | null = null;
  exhibits.forEach((exhibit, index) => {
    const shared = [...significantWords(exhibit.title)].filter((w) => words.has(w)).length;
    if (shared > 0 && (!best || shared > best.shared)) best = { index, shared };
  });
  return best === null ? null : (best as { index: number }).index;
}
