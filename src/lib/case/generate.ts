import "server-only";

import { z } from "zod";

import { estimateCostUsd, generateObject, type AiClient, type AiResult } from "@/lib/ai";
import type { WikipediaClient } from "@/lib/sources/wikipedia";

import { finalizeCase } from "./finalize";
import {
  caseContentSchema,
  clueSchema,
  hypothesisSchema,
  solutionSentenceSchema,
  type CaseContent,
  type GenerationInfo,
  type SourceText,
} from "./schema";
import { verifyCase, type VerificationReport } from "./verify";

export const MAX_REPAIR_ROUNDS = 2;
/** Characters kept per source, primary article first; bounds cost and latency. */
const SOURCE_CHAR_LIMITS = [32_000, 16_000];
const MIN_SOURCE_CHARS = 1_500;
const SEARCH_RESULTS = 4;
/** Namesake articles about products, media or venues ("Rosetta Stone (software)") are never evidence. */
const OFF_TOPIC_TITLE =
  /\((software|company|brand|app|website|band|album|song|single|film|movie|tv series|television series|video game|game|board game|novel|book|comics|manga|anime|character|musical|play|magazine|newspaper|podcast|public house|pub|restaurant|hotel)\)$/i;

export type GenerationStage = "finding_sources" | "drafting_clues" | "checking_citations" | "repairing";

export interface GenerationEvent {
  stage: GenerationStage;
  message: string;
}

export class GenerationError extends Error {
  constructor(
    readonly reason: "no_sources" | "unverifiable",
    message: string,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

export interface GeneratedCase {
  content: CaseContent;
  sources: SourceText[];
  verification: VerificationReport;
  generation: GenerationInfo;
}

export interface GenerateCaseOptions {
  ai: AiClient;
  wikipedia: WikipediaClient;
  /** Optional direction for curated topics, e.g. the question the case should ask. */
  angle?: string;
  onEvent?: (event: GenerationEvent) => void;
  random?: () => number;
}

const casePatchSchema = z.object({
  clues: z.array(clueSchema).describe("Complete replacement clues, matched by id; empty if none change"),
  hypotheses: z.array(hypothesisSchema).describe("Complete replacement hypotheses, matched by id; empty if none change"),
  title: z.string().nullable().describe("New title, or null to keep it"),
  solution: z.array(solutionSentenceSchema).nullable().describe("New solution, or null to keep it"),
  learned: z.array(z.string()).nullable().describe("New learned points, or null to keep them"),
});
type CasePatch = z.infer<typeof casePatchSchema>;

/** Topic -> Wikipedia sources -> drafted case -> code verification -> targeted repairs -> verified case. */
export async function generateCase(topic: string, options: GenerateCaseOptions): Promise<GeneratedCase> {
  const { ai, wikipedia, angle, onEvent = () => {}, random = Math.random } = options;
  const startedAt = Date.now();
  const calls: AiResult[] = [];

  onEvent({ stage: "finding_sources", message: "Finding sources on Wikipedia" });
  const sources = await findSources(topic, wikipedia);
  const request = { system: SYSTEM_PROMPT, context: sourcesContext(sources) };

  onEvent({ stage: "drafting_clues", message: `Drafting clues from ${sources.map((s) => s.title).join(" and ")}` });
  const drafted = await generateObject(ai, { ...request, prompt: draftPrompt(topic, angle) }, caseContentSchema);
  calls.push(...drafted.calls);
  let content = drafted.value;

  onEvent({ stage: "checking_citations", message: "Checking every quote against the sources" });
  let report = verifyCase(content, sources);
  let repairRounds = 0;
  while (!report.ok && repairRounds < MAX_REPAIR_ROUNDS) {
    repairRounds += 1;
    onEvent({ stage: "repairing", message: `Fixing ${report.failures.length} failed check(s), round ${repairRounds}` });
    const patch = await generateObject(ai, { ...request, prompt: repairPrompt(topic, content, report) }, casePatchSchema);
    calls.push(...patch.calls);
    content = applyPatch(content, patch.value);
    report = verifyCase(content, sources);
  }
  if (!report.ok) {
    throw new GenerationError("unverifiable", `Case still fails ${report.failures.length} check(s) after ${repairRounds} repair rounds`);
  }

  const finalized = finalizeCase(content, random);
  // Only sources that clues actually quote are kept, so the sources list always matches the evidence.
  const cited = sources.filter((source) => finalized.clues.some((clue) => clue.sourceId === source.id));
  const verification = verifyCase(finalized, cited);
  if (!verification.ok) throw new GenerationError("unverifiable", "Case failed verification after finalizing");

  return {
    content: finalized,
    sources: cited,
    verification,
    generation: {
      providers: unique(calls.map((c) => c.provider)),
      models: unique(calls.flatMap((c) => (c.usage ? [c.usage.model] : []))),
      repairRounds,
      costUsd: estimateCostUsd(calls.map((c) => c.usage)),
      durationMs: Date.now() - startedAt,
    },
  };
}

async function findSources(topic: string, wikipedia: WikipediaClient): Promise<SourceText[]> {
  const titles = (await wikipedia.search(topic, SEARCH_RESULTS)).filter((title) => !OFF_TOPIC_TITLE.test(title));
  const articles = await Promise.all(titles.map((title) => wikipedia.article(title).catch(() => null)));
  const usable = articles.filter(
    (a): a is NonNullable<typeof a> => a !== null && a.text.length >= MIN_SOURCE_CHARS && !/may refer to:/i.test(a.text.slice(0, 400)),
  );
  if (usable.length === 0) throw new GenerationError("no_sources", `No usable Wikipedia article found for "${topic}"`);

  return usable.slice(0, SOURCE_CHAR_LIMITS.length).map((article, index) => ({
    id: `S${index + 1}`,
    title: article.title,
    url: article.url,
    revisionId: article.revisionId,
    text: truncateAtParagraph(article.text, SOURCE_CHAR_LIMITS[index]),
  }));
}

function truncateAtParagraph(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.lastIndexOf("\n", limit);
  return text.slice(0, cut > limit / 2 ? cut : limit).trim();
}

export function applyPatch(content: CaseContent, patch: CasePatch): CaseContent {
  return {
    ...content,
    title: patch.title ?? content.title,
    clues: mergeById(content.clues, patch.clues),
    hypotheses: mergeById(content.hypotheses, patch.hypotheses),
    solution: patch.solution ?? content.solution,
    learned: patch.learned ?? content.learned,
  };
}

function mergeById<T extends { id: string }>(items: T[], replacements: T[]): T[] {
  const byId = new Map(replacements.map((r) => [r.id, r]));
  const merged = items.map((item) => byId.get(item.id) ?? item);
  const added = replacements.filter((r) => !items.some((item) => item.id === r.id));
  return [...merged, ...added];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function sourcesContext(sources: SourceText[]): string {
  return sources.map((s) => `Source ${s.id}: ${s.title}\nURL: ${s.url}\n\n${s.text}`).join("\n\n---\n\n");
}

function draftPrompt(topic: string, angle: string | undefined): string {
  return [`Topic: ${topic}`, angle ? `Angle: ${angle}` : null, "Build the case from the sources above."].filter(Boolean).join("\n");
}

function repairPrompt(topic: string, content: CaseContent, report: VerificationReport): string {
  const failures = report.failures
    .map((f) => `- ${f.target.type === "case" ? "case" : `${f.target.type} ${f.target.id}`} [${f.check}]: ${f.message}`)
    .join("\n");
  return [
    `Topic: ${topic}`,
    "Your draft case:",
    JSON.stringify(content),
    "",
    "Automated checks failed:",
    failures,
    "",
    "Return a patch. Give complete replacement objects for the clues and hypotheses that must change, keeping their ids; include any other clue whose supports or refutes must change to satisfy the logic rules. Give a new title, solution or learned list only if a check about it failed, otherwise null. For a quote problem, choose a passage that appears exactly in the source text.",
  ].join("\n");
}

const SYSTEM_PROMPT = `You write Daily Case puzzles: short, fair detective investigations of real, well-documented history and science questions for curious adults in the US. Every fact must come from the source texts provided below. Code checks every quote against those texts, character for character, and checks the logic rules.

Write the case as JSON:
- title: a question a curious adult would want answered, at most 90 characters, ending with "?". It must not give the answer away.
- category: "history" or "science". era: a short label such as "1854 London".
- clues: exactly 8, ids "c1" to "c8" in play order. c1 and c2 are opening clues that set up the mystery; c3 to c8 are sealed evidence the player pays to open.
  - headline: at most 8 words.
  - body: 1-2 sentences in your own words saying what the evidence shows. Do not repeat the quote.
  - quote: one passage of 8 to 40 words copied exactly from a source text: same words, same order, same spelling and punctuation. No ellipses, no brackets, no added or changed words, no joining of separate passages.
  - sourceId: the id of the source the quote comes from, such as "S1".
  - kind: document, testimony, record or artifact.
  - supports and refutes: ids of the hypotheses the clue's evidence supports or rules out.
- hypotheses: exactly 4, ids "h1" to "h4". Exactly one is correct: the answer the sources document. The other three are decoys a curious adult could believe, such as rival theories of the time or common misconceptions, each ruled out by specific evidence in at least one clue.
- Logic rules: the correct hypothesis is supported by at least 2 clues and refuted by none; every decoy is refuted by at least one clue; c1 and c2 together must not refute all three decoys; no clue both supports and refutes the same hypothesis.
- solution: 3 to 5 sentences explaining the answer; each lists the ids of the clues it relies on.
- learned: exactly 3 short facts the player takes away.

Content rules: family-friendly; no graphic or gory descriptions; no sexual content; nothing about tragedies from the last 25 years, living private individuals or contested current politics. Write in US English.`;
