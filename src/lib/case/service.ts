import "server-only";

import { estimateCostUsd, getGenerationAi, getNarrationAi } from "@/lib/ai";
import { insertCase } from "@/lib/db/cases";
import { getExhibits, type Exhibit } from "@/lib/sources/exhibits";
import { getWikipedia } from "@/lib/sources/wikipedia";

import { generateCase, type GeneratedCase, type GenerationEvent } from "./generate";
import { writeNarration } from "./narrate";
import { publicCaseText, type Narration } from "./narration";
import type { CaseKind, CaseRecord } from "./schema";
import { normalizeTopic, slugify } from "./topic";

export interface CreateCaseInput {
  topic: string;
  angle?: string;
  kind: CaseKind;
  /** Required for a daily case: its America/New_York date, YYYY-MM-DD. */
  dateKey?: string;
  /** The player who asked for a topic case. */
  createdBy?: string;
  onEvent?: (event: GenerationEvent) => void;
}

/** A verified case plus its presentation layer: archive images and comic-panel narration. */
export interface DraftedCase extends GeneratedCase {
  exhibits: Exhibit[];
  narration: Narration;
}

/** Generates a verified case from live sources, then its exhibits and narration. Nothing is stored. */
export async function draftCase(input: Omit<CreateCaseInput, "kind" | "dateKey">): Promise<DraftedCase> {
  const generated = await generateCase(input.topic, {
    ai: getGenerationAi(),
    wikipedia: getWikipedia(),
    angle: input.angle,
    onEvent: input.onEvent,
  });

  input.onEvent?.({ stage: "assembling_file", message: "Pulling archive images and writing the briefing" });
  const [exhibits, narrated] = await Promise.all([
    getExhibits().find(generated.sources, publicCaseText(generated.content)),
    writeNarration(getNarrationAi(), generated.content),
  ]);

  const { generation } = generated;
  const narrationCost = estimateCostUsd(narrated.calls.map((c) => c.usage));
  return {
    ...generated,
    exhibits,
    narration: narrated.narration,
    generation: {
      ...generation,
      providers: [...new Set([...generation.providers, ...narrated.calls.map((c) => c.provider)])],
      models: [...new Set([...generation.models, ...narrated.calls.flatMap((c) => (c.usage ? [c.usage.model] : []))])],
      costUsd: generation.costUsd === null || narrationCost === null ? null : generation.costUsd + narrationCost,
    },
  };
}

export async function storeCase(drafted: DraftedCase, input: CreateCaseInput): Promise<CaseRecord> {
  const { content, sources, verification, generation, exhibits, narration } = drafted;
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
    exhibits,
    narration,
    createdBy: input.createdBy ?? null,
  });
}

export async function createCase(input: CreateCaseInput): Promise<CaseRecord> {
  return storeCase(await draftCase(input), input);
}
