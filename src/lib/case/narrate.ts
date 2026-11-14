import "server-only";

import type { z } from "zod";

import { generateObject, type AiClient, type AiResult } from "@/lib/ai";

import {
  checkNarration,
  closingNarrationSchema,
  fallbackNarration,
  introNarrationSchema,
  NARRATION_MAX_CHARS,
  type Narration,
  type NarrationIssue,
  type NarrationPart,
} from "./narration";
import { OPENING_CLUE_COUNT, type CaseContent } from "./schema";

export const NARRATION_ATTEMPTS = 2;

export interface NarrationResult {
  narration: Narration;
  /** Parts that fell back to the case's own words after failing the check or the call. */
  fallbackParts: NarrationPart[];
  /** Why attempts were rejected or failed, for logs. */
  problems: string[];
  calls: AiResult[];
}

/**
 * Comic-panel narration with a cheap model. The intro is written from the public file only, so the
 * model never sees which theory is right; the closing gets the solution and is shown only at the end.
 * Never throws: a part that can't be written cleanly falls back to the case's own words.
 */
export async function writeNarration(ai: AiClient, content: CaseContent): Promise<NarrationResult> {
  const fallback = fallbackNarration(content);
  const [intro, closing] = await Promise.all([
    writePart(ai, INTRO_SYSTEM, introPrompt(content), introNarrationSchema, (value) => checkNarration(value, content)),
    writePart(ai, CLOSING_SYSTEM, closingPrompt(content), closingNarrationSchema, (value) => checkNarration(value, content)),
  ]);

  const narration: Narration = {
    setting: intro.value?.setting.trim() ?? fallback.setting,
    mystery: intro.value?.mystery.trim() ?? fallback.mystery,
    task: intro.value?.task.trim() ?? fallback.task,
    closing: closing.value?.closing.trim() ?? fallback.closing,
  };
  return {
    narration,
    fallbackParts: [...(intro.value ? [] : (["setting", "mystery", "task"] as const)), ...(closing.value ? [] : (["closing"] as const))],
    problems: [...intro.problems, ...closing.problems],
    calls: [...intro.calls, ...closing.calls],
  };
}

async function writePart<T>(
  ai: AiClient,
  system: string,
  prompt: string,
  schema: z.ZodType<T>,
  check: (value: T) => NarrationIssue[],
): Promise<{ value: T | null; calls: AiResult[]; problems: string[] }> {
  const calls: AiResult[] = [];
  const problems: string[] = [];
  let feedback = "";
  for (let attempt = 1; attempt <= NARRATION_ATTEMPTS; attempt += 1) {
    try {
      const result = await generateObject(ai, { system, prompt: prompt + feedback, maxOutputTokens: 2_000 }, schema);
      calls.push(...result.calls);
      const issues = check(result.value);
      if (issues.length === 0) return { value: result.value, calls, problems };
      const found = issues.map((i) => `${i.part} ${i.problem.replace("_", " ")} (${i.detail})`).join("; ");
      problems.push(found);
      feedback = `\n\nYour previous answer was rejected by the checker: ${found}. Write it again without those problems.`;
    } catch (error) {
      problems.push(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      return { value: null, calls, problems };
    }
  }
  return { value: null, calls, problems };
}

const SHARED_RULES = `Rules:
- Use only facts stated in the case file. Do not add any name, place, date or number that is not in it.
- No quotation marks and no dialogue; never put words in a real person's mouth.
- Each field is 1-2 short sentences, at most ${NARRATION_MAX_CHARS - 40} characters.
- Plain, vivid US English; family-friendly; no gore.`;

const INTRO_SYSTEM = `You write the opening narration for Daily Case, a detective game about a real history or science question. Before the evidence board, the player sees three comic panels with caption boxes:
- setting: where and when the story takes place, drawn from the era and opening evidence.
- mystery: the puzzle in plain words, raising the stakes from the opening evidence.
- task: what the player must do now, addressed to the player as "you" (weigh the evidence, open sealed files, accuse the right theory).
Never hint which theory is correct: do not restate, name or compare any of the theories; the player reads them on the board.
${SHARED_RULES}`;

const CLOSING_SYSTEM = `You write the closing caption for Daily Case, a detective game about a real history or science question. The player has just finished the case; the full solution is shown below your caption. Write one field, closing: 1-2 sentences that close the story by stating what the evidence showed.
${SHARED_RULES}`;

function introPrompt(content: CaseContent): string {
  const opening = content.clues.slice(0, OPENING_CLUE_COUNT);
  return [
    "Case file (what the player can see at the start):",
    `Question: ${content.title}`,
    `Era: ${content.era}`,
    "Opening evidence:",
    ...opening.map((c) => `- ${c.headline}. ${c.body} Quote from the source: ${c.quote}`),
    "Theories the player will weigh (do not say which is right):",
    ...content.hypotheses.map((h) => `- ${h.text}`),
  ].join("\n");
}

function closingPrompt(content: CaseContent): string {
  const answer = content.hypotheses.find((h) => h.correct);
  return [
    "Case file:",
    `Question: ${content.title}`,
    `Era: ${content.era}`,
    `Answer: ${answer?.text ?? ""}`,
    "Solution:",
    ...content.solution.map((s) => `- ${s.text}`),
    "Evidence:",
    ...content.clues.map((c) => `- ${c.headline}. ${c.body}`),
  ].join("\n");
}
