import "server-only";

import { z } from "zod";

import { generateObject, type AiClient } from "@/lib/ai";

import { MAX_TOPIC_LENGTH, MIN_TOPIC_LENGTH } from "./topic";

export type SafetyVerdict = { allowed: true } | { allowed: false; reason: string; retryable: boolean };

const RULES: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(sex|sexual|porn\w*|nude|naked|erotic\w*|fetish\w*|rape\w*|incest|prostitut\w*|orgy)\b/i,
    reason: "Daily Case keeps things family-friendly, so this topic is off the table.",
  },
  {
    pattern: /\b(gore|gory|tortur\w*|behead\w*|dismember\w*|mutilat\w*|cannibal\w*|serial killers?|snuff)\b/i,
    reason: "Daily Case stays away from graphic violence. Try another mystery.",
  },
  {
    pattern: /\b(suicide|self[- ]harm)\b/i,
    reason: "We don't make cases about this topic. If you are struggling, please reach out to someone you trust or call or text 988.",
  },
  {
    pattern: /\b(trump|biden|kamala|harris|vance|obama|putin|zelensky\w*|netanyahu|maga|abortion|gun control|gaza|hamas|hezbollah|israel|palestine|palestinians?)\b/i,
    reason: "Daily Case avoids contested current politics. Try a mystery from history or science.",
  },
  {
    pattern: /\b(9\/11|september 11|covid\w*|coronavirus|sars-cov-2)\b/i,
    reason: "Daily Case avoids recent tragedies. Try a mystery from further back.",
  },
];
const RECENT_YEAR = /\b(200[1-9]|201\d|202\d)\b/;
const TRAGEDY = /\b(attacks?|shootings?|bombings?|crash(es)?|disasters?|massacres?|wars?|pandemics?|earthquakes?|tsunamis?|hurricanes?|wildfires?|collapses?|deaths?|killings?)\b/i;

/** Fast, deterministic checks that run before any model call. */
export function checkTopicRules(topic: string): SafetyVerdict {
  const trimmed = topic.trim();
  if (trimmed.length < MIN_TOPIC_LENGTH || trimmed.length > MAX_TOPIC_LENGTH || !/\p{L}.*\p{L}/u.test(trimmed)) {
    return {
      allowed: false,
      reason: `Describe a topic in ${MIN_TOPIC_LENGTH} to ${MAX_TOPIC_LENGTH} characters, such as "the Antikythera mechanism".`,
      retryable: false,
    };
  }
  for (const rule of RULES) {
    if (rule.pattern.test(trimmed)) return { allowed: false, reason: rule.reason, retryable: false };
  }
  if (RECENT_YEAR.test(trimmed) && TRAGEDY.test(trimmed)) {
    return { allowed: false, reason: "Daily Case avoids recent tragedies. Try a mystery from further back.", retryable: false };
  }
  return { allowed: true };
}

const classification = z.object({
  allowed: z.boolean(),
  reason: z.string().describe("If not allowed: one short, friendly sentence for the user explaining why"),
});

const CLASSIFIER_PROMPT = `You screen topics for Daily Case, a family-friendly game that turns a real, well-documented history or science question into a short detective case built from Wikipedia.

Allow the topic only if all of these hold:
- It is about real history or science, and reliable sources document an answer (not an unsolved mystery or a matter of opinion).
- It is family-friendly: no sexual content and no focus on graphic violence or gore.
- It is not a tragedy from the last 25 years, not about a living private individual, and not contested current politics.
- It is not fiction, celebrity gossip, sports results, personal advice, or a conspiracy theory presented as fact.

Answer with JSON.`;

/** Deterministic rules first, then a small-model classification for what rules cannot catch. */
export async function checkTopicSafety(topic: string, ai: AiClient): Promise<SafetyVerdict> {
  const ruled = checkTopicRules(topic);
  if (!ruled.allowed) return ruled;

  try {
    const { value } = await generateObject(
      ai,
      { system: CLASSIFIER_PROMPT, prompt: `Topic: ${topic.trim()}`, maxOutputTokens: 2_000 },
      classification,
    );
    return value.allowed
      ? { allowed: true }
      : { allowed: false, reason: value.reason || "This topic doesn't fit Daily Case. Try another one.", retryable: false };
  } catch {
    return { allowed: false, reason: "We couldn't check this topic right now. Please try again in a moment.", retryable: true };
  }
}
