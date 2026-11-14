import { z } from "zod";

export const CLUE_COUNT = 8;
export const OPENING_CLUE_COUNT = 2;
export const HYPOTHESIS_COUNT = 4;
export const LEARNED_COUNT = 3;
export const SOLUTION_MIN_SENTENCES = 3;
export const SOLUTION_MAX_SENTENCES = 5;
export const MAX_QUOTE_WORDS = 40;
export const MAX_HEADLINE_WORDS = 8;

export const clueKinds = ["document", "testimony", "record", "artifact"] as const;
export const caseCategories = ["history", "science"] as const;
export const caseKinds = ["daily", "archive", "topic"] as const;

export const clueSchema = z.object({
  id: z.string().describe('Stable id, "c1" to "c8" in play order'),
  headline: z.string().describe("At most 8 words"),
  body: z.string().describe("1-2 sentences in our own words; never repeats the quote"),
  quote: z.string().describe("Copied character for character from the source text, at most 40 words, no ellipses"),
  sourceId: z.string().describe('Id of the source the quote comes from, e.g. "S1"'),
  kind: z.enum(clueKinds),
  supports: z.array(z.string()).describe("Ids of hypotheses this clue supports"),
  refutes: z.array(z.string()).describe("Ids of hypotheses this clue refutes"),
});

export const hypothesisSchema = z.object({
  id: z.string().describe('"h1" to "h4"'),
  text: z.string().describe("One sentence answering the case question"),
  correct: z.boolean(),
});

export const solutionSentenceSchema = z.object({
  text: z.string(),
  clueIds: z.array(z.string()).describe("Clues that back this sentence"),
});

/** What the model writes. Counts and cross-references are checked by the verifier, not the schema. */
export const caseContentSchema = z.object({
  title: z.string().describe("A question, ending with a question mark"),
  category: z.enum(caseCategories),
  era: z.string().describe('Short era label, e.g. "1815" or "Victorian London"'),
  clues: z.array(clueSchema),
  hypotheses: z.array(hypothesisSchema),
  solution: z.array(solutionSentenceSchema),
  learned: z.array(z.string()),
});

export const caseSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  revisionId: z.number().int(),
});

export type Clue = z.infer<typeof clueSchema>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;
export type CaseContent = z.infer<typeof caseContentSchema>;
export type CaseSource = z.infer<typeof caseSourceSchema>;
export type ClueKind = (typeof clueKinds)[number];
export type CaseCategory = (typeof caseCategories)[number];
export type CaseKind = (typeof caseKinds)[number];

/** A source as given to the model: its text is what every quote is checked against. */
export interface SourceText extends CaseSource {
  text: string;
}

/** How a case was produced; stored with it for cost and quality tracking. */
export interface GenerationInfo {
  providers: string[];
  models: string[];
  /** Repair rounds needed after the first draft (0 means the draft verified as written). */
  repairRounds: number;
  costUsd: number | null;
  durationMs: number;
}

/** A verified case as stored and served. */
export interface CaseRecord {
  id: string;
  slug: string;
  number: number | null;
  kind: CaseKind;
  dateKey: string | null;
  content: CaseContent;
  sources: CaseSource[];
}

export function openingClues(content: CaseContent): Clue[] {
  return content.clues.slice(0, OPENING_CLUE_COUNT);
}
