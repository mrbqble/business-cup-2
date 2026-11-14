import "server-only";

import { getGenerationAi } from "@/lib/ai";
import { insertCase } from "@/lib/db/cases";
import { getWikipedia } from "@/lib/sources/wikipedia";

import { generateCase, type GeneratedCase, type GenerationEvent } from "./generate";
import type { CaseKind, CaseRecord } from "./schema";
import { normalizeTopic, slugify } from "./topic";

export interface CreateCaseInput {
  topic: string;
  angle?: string;
  kind: CaseKind;
  /** Required for a daily case: its America/New_York date, YYYY-MM-DD. */
  dateKey?: string;
  onEvent?: (event: GenerationEvent) => void;
}

/** Generates a verified case from live sources. Nothing is stored. */
export function draftCase(input: Omit<CreateCaseInput, "kind" | "dateKey">): Promise<GeneratedCase> {
  return generateCase(input.topic, {
    ai: getGenerationAi(),
    wikipedia: getWikipedia(),
    angle: input.angle,
    onEvent: input.onEvent,
  });
}

export async function storeCase(generated: GeneratedCase, input: CreateCaseInput): Promise<CaseRecord> {
  const { content, sources, verification, generation } = generated;
  return insertCase({
    slug: slugify(content.title),
    kind: input.kind,
    dateKey: input.kind === "daily" ? (input.dateKey ?? null) : null,
    topicKey: input.kind === "topic" ? normalizeTopic(input.topic) : null,
    title: content.title,
    category: content.category,
    payload: content,
    // The source text is not stored: the URL and revision id pin exactly what was quoted.
    sources: sources.map(({ id, title, url, revisionId }) => ({ id, title, url, revisionId })),
    verification,
    generation,
  });
}

export async function createCase(input: CreateCaseInput): Promise<CaseRecord> {
  return storeCase(await draftCase(input), input);
}
