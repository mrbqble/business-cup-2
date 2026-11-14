import { countWords, hasEllipsis, quoteAppearsIn } from "./quote";
import {
  CLUE_COUNT,
  HYPOTHESIS_COUNT,
  LEARNED_COUNT,
  MAX_HEADLINE_WORDS,
  MAX_QUOTE_WORDS,
  OPENING_CLUE_COUNT,
  SOLUTION_MAX_SENTENCES,
  SOLUTION_MIN_SENTENCES,
  type CaseContent,
  type SourceText,
} from "./schema";

export type VerificationTarget =
  | { type: "case" }
  | { type: "clue"; id: string }
  | { type: "hypothesis"; id: string };

export interface VerificationFailure {
  check: string;
  target: VerificationTarget;
  message: string;
}

export interface QuoteCheck {
  clueId: string;
  sourceId: string;
  found: boolean;
}

export interface VerificationReport {
  ok: boolean;
  failures: VerificationFailure[];
  quotes: QuoteCheck[];
}

const CASE: VerificationTarget = { type: "case" };

/** Checks a drafted case against its sources. Pure: the same input always gives the same report. */
export function verifyCase(content: CaseContent, sources: readonly SourceText[]): VerificationReport {
  const failures: VerificationFailure[] = [];
  const fail = (check: string, target: VerificationTarget, message: string) =>
    failures.push({ check, target, message });

  const { clues, hypotheses } = content;
  const hypothesisIds = new Set(hypotheses.map((h) => h.id));
  const sourcesById = new Map(sources.map((s) => [s.id, s]));

  if (!content.title.trim().endsWith("?")) fail("title_question", CASE, "The title must be a question.");
  if (clues.length !== CLUE_COUNT) fail("clue_count", CASE, `Expected ${CLUE_COUNT} clues, got ${clues.length}.`);
  if (hypotheses.length !== HYPOTHESIS_COUNT) {
    fail("hypothesis_count", CASE, `Expected ${HYPOTHESIS_COUNT} hypotheses, got ${hypotheses.length}.`);
  }
  for (const id of duplicates(clues.map((c) => c.id))) fail("clue_ids_unique", { type: "clue", id }, `Clue id ${id} repeats.`);
  for (const id of duplicates(hypotheses.map((h) => h.id))) {
    fail("hypothesis_ids_unique", { type: "hypothesis", id }, `Hypothesis id ${id} repeats.`);
  }

  const quotes: QuoteCheck[] = [];
  for (const clue of clues) {
    const target: VerificationTarget = { type: "clue", id: clue.id };
    if (countWords(clue.headline) > MAX_HEADLINE_WORDS) {
      fail("headline_length", target, `Headline has more than ${MAX_HEADLINE_WORDS} words.`);
    }
    if (clue.body.trim() === "") fail("body_present", target, "Body is empty.");
    for (const id of [...clue.supports, ...clue.refutes]) {
      if (!hypothesisIds.has(id)) fail("clue_refs", target, `References unknown hypothesis ${id}.`);
    }
    for (const id of clue.supports.filter((id) => clue.refutes.includes(id))) {
      fail("clue_refs", target, `Both supports and refutes ${id}.`);
    }

    const source = sourcesById.get(clue.sourceId);
    if (!source) {
      fail("clue_source", target, `Unknown source ${clue.sourceId}.`);
      quotes.push({ clueId: clue.id, sourceId: clue.sourceId, found: false });
      continue;
    }
    if (hasEllipsis(clue.quote)) fail("quote_ellipsis", target, "Quote leaves text out with an ellipsis.");
    if (countWords(clue.quote) > MAX_QUOTE_WORDS) fail("quote_length", target, `Quote is longer than ${MAX_QUOTE_WORDS} words.`);
    const found = quoteAppearsIn(clue.quote, source.text);
    if (!found) fail("quote_in_source", target, `Quote not found verbatim in ${source.title}.`);
    quotes.push({ clueId: clue.id, sourceId: source.id, found });
  }

  const correct = hypotheses.filter((h) => h.correct);
  if (correct.length !== 1) fail("correct_count", CASE, `Expected exactly 1 correct hypothesis, got ${correct.length}.`);

  const supportersOf = (id: string) => clues.filter((c) => c.supports.includes(id));
  const refutersOf = (id: string) => clues.filter((c) => c.refutes.includes(id));
  for (const hypothesis of hypotheses) {
    const target: VerificationTarget = { type: "hypothesis", id: hypothesis.id };
    if (hypothesis.correct) {
      if (supportersOf(hypothesis.id).length < 2) fail("correct_supported", target, "Fewer than 2 clues support the answer.");
      if (refutersOf(hypothesis.id).length > 0) fail("correct_not_refuted", target, "A clue refutes the answer.");
    } else if (refutersOf(hypothesis.id).length === 0) {
      fail("decoy_refuted", target, "No clue refutes this decoy.");
    }
  }

  const opening = clues.slice(0, OPENING_CLUE_COUNT);
  const decoys = hypotheses.filter((h) => !h.correct);
  if (decoys.length > 0 && decoys.every((d) => opening.some((c) => c.refutes.includes(d.id)))) {
    fail("opening_not_decisive", CASE, "The opening clues alone rule out every decoy.");
  }

  const clueIds = new Set(clues.map((c) => c.id));
  const { solution, learned } = content;
  if (solution.length < SOLUTION_MIN_SENTENCES || solution.length > SOLUTION_MAX_SENTENCES) {
    fail("solution_length", CASE, `Solution needs ${SOLUTION_MIN_SENTENCES}-${SOLUTION_MAX_SENTENCES} sentences, got ${solution.length}.`);
  }
  solution.forEach((sentence, index) => {
    if (sentence.clueIds.length === 0 || sentence.clueIds.some((id) => !clueIds.has(id))) {
      fail("solution_refs", CASE, `Solution sentence ${index + 1} must cite existing clues.`);
    }
  });
  if (learned.length !== LEARNED_COUNT) fail("learned_count", CASE, `Expected ${LEARNED_COUNT} learned points, got ${learned.length}.`);

  return { ok: failures.length === 0, failures, quotes };
}

function duplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) (seen.has(id) ? repeated : seen).add(id);
  return [...repeated];
}
