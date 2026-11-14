import { z } from "zod";

import { OPENING_CLUE_COUNT, type CaseContent } from "./schema";

export const NARRATION_MAX_CHARS = 260;

export const introNarrationSchema = z.object({
  setting: z.string().describe("Panel 1: where and when, 1-2 short sentences"),
  mystery: z.string().describe("Panel 2: the puzzle in plain words, 1-2 short sentences"),
  task: z.string().describe("Panel 3: what the player must do, addressed to you, 1-2 short sentences"),
});

export const closingNarrationSchema = z.object({
  closing: z.string().describe("End panel: what the evidence showed, 1-2 short sentences"),
});

export const narrationSchema = introNarrationSchema.extend(closingNarrationSchema.shape);

export type IntroNarration = z.infer<typeof introNarrationSchema>;
export type Narration = z.infer<typeof narrationSchema>;
export type NarrationPart = keyof Narration;

export const INTRO_PARTS = ["setting", "mystery", "task"] as const satisfies readonly NarrationPart[];

export interface NarrationIssue {
  part: NarrationPart;
  problem: "length" | "dialogue" | "unknown_year" | "unknown_name";
  detail: string;
}

/** What the player can read before opening anything: the question, era, opening clues and theories. */
export function publicCaseText(content: CaseContent): string {
  const opening = content.clues.slice(0, OPENING_CLUE_COUNT).flatMap((c) => [c.headline, c.body, c.quote]);
  return [content.title, content.era, ...opening, ...content.hypotheses.map((h) => h.text)].join("\n");
}

/** Everything the case states, including sealed clues and the solution. */
export function fullCaseText(content: CaseContent): string {
  return [
    publicCaseText(content),
    ...content.clues.flatMap((c) => [c.headline, c.body, c.quote]),
    ...content.solution.map((s) => s.text),
    ...content.learned,
  ].join("\n");
}

/** Narration built only from the case's own words; used when the model's narration fails the check. */
export function fallbackNarration(content: CaseContent): Narration {
  return {
    setting: `The file is marked ${content.era}.`,
    mystery: content.title,
    task: "Read the evidence, open sealed files when you need more, and accuse the theory the sources support.",
    closing: content.solution[0]?.text ?? "The evidence is in. Here is what really happened.",
  };
}

/**
 * Narration may only restate the case: no quotation marks (no invented dialogue), and no years or
 * proper names the case doesn't contain. Intro panels are checked against the public part only,
 * so they can't name anything from sealed evidence; the closing may use the whole case.
 */
export function checkNarration(narration: Partial<Narration>, content: CaseContent): NarrationIssue[] {
  const publicVocab = vocabulary(publicCaseText(content));
  const fullVocab = vocabulary(fullCaseText(content));
  const issues: NarrationIssue[] = [];

  for (const [part, text] of Object.entries(narration) as [NarrationPart, string | undefined][]) {
    if (text === undefined) continue;
    const vocab = part === "closing" ? fullVocab : publicVocab;
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed.length > NARRATION_MAX_CHARS) {
      issues.push({ part, problem: "length", detail: `${trimmed.length} characters (1 to ${NARRATION_MAX_CHARS} allowed)` });
    }
    if (/["“”«»„]/.test(trimmed)) issues.push({ part, problem: "dialogue", detail: "uses quotation marks" });
    for (const year of trimmed.match(YEAR) ?? []) {
      if (!vocab.numbers.has(year)) issues.push({ part, problem: "unknown_year", detail: year });
    }
    for (const name of properNames(trimmed, vocab)) {
      issues.push({ part, problem: "unknown_name", detail: name });
    }
  }
  return issues;
}

const YEAR = /(?<!\d)\d{3,4}(?!\d)/g;
const WORD = /\p{L}[\p{L}\p{M}'’-]*/gu;
/** Narration words that are capitalized without being names. */
const ALLOWED_CAPITALIZED = new Set(["I", "Detective", "Archivist", "Daily", "Case"]);
/** Common sentence openers, so "Somewhere" or "Your" at the start of a sentence isn't read as a name. */
const COMMON_OPENERS = new Set(
  (
    "a an the this that these those there here it its in on at by for from with without within into onto of to as if " +
    "and but or nor yet so then now once soon still even only just long after before during while when where why how what " +
    "who whom whose which whatever whoever you your yours we our us they their them he his him she her hers one two three " +
    "four five six seven eight some many most all every each no not nobody someone something somewhere somehow everyone " +
    "everything nothing few several both either neither across over under between behind beyond inside outside through " +
    "throughout around near far today tonight tomorrow yesterday was were is are be been did do does can could would should " +
    "will may might must has have had let read open weigh study sift follow find decide examine trace name pick choose test " +
    "look search dig uncover investigate consider compare piece start begin take ask answer prove rule check judge solve " +
    "crack close case evidence clues clue records witnesses documents historians scientists experts people records sources " +
    "theories theory four rival centuries decades years months weeks days hours history science legend rumor rumors"
  ).split(" "),
);

interface Vocabulary {
  words: Set<string>;
  lowercase: Set<string>;
  numbers: Set<string>;
}

function vocabulary(text: string): Vocabulary {
  const words = new Set<string>();
  const lowercase = new Set<string>();
  for (const match of text.matchAll(WORD)) {
    const word = stripPossessive(match[0]);
    words.add(word);
    if (word === word.toLowerCase()) lowercase.add(word);
  }
  return { words, lowercase, numbers: new Set(text.match(YEAR) ?? []) };
}

/** Capitalized words that look like names and that the vocabulary doesn't contain. */
function properNames(text: string, vocab: Vocabulary): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(WORD)) {
    const word = stripPossessive(match[0]);
    if (!/^\p{Lu}/u.test(word) || ALLOWED_CAPITALIZED.has(word) || vocab.words.has(word)) continue;
    const before = text.slice(0, match.index).trimEnd();
    const sentenceStart = before === "" || /[.!?:;—–]$/.test(before);
    const lower = word.toLowerCase();
    if (sentenceStart && (COMMON_OPENERS.has(lower) || vocab.lowercase.has(lower))) continue;
    if (!found.includes(word)) found.push(word);
  }
  return found;
}

function stripPossessive(word: string): string {
  return word.replace(/['’]s$/u, "").replace(/['’-]+$/u, "");
}
