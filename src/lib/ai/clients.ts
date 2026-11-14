import "server-only";

import { createAiClient } from "./client";
import { resolveProviders } from "./config";
import type { AiClient } from "./types";

export const DEFAULT_GENERATION_PROVIDERS = "claude-sonnet,claude-haiku";
export const DEFAULT_SAFETY_PROVIDERS = "claude-haiku";

/** Case drafting can take a minute or two on long sources. */
const GENERATION_TIMEOUT_MS = 150_000;
const SAFETY_TIMEOUT_MS = 20_000;

export function generationProviderList(env: Record<string, string | undefined> = process.env): string {
  return env.AI_PROVIDERS || DEFAULT_GENERATION_PROVIDERS;
}

let generation: AiClient | undefined;
let safety: AiClient | undefined;

export function getGenerationAi(): AiClient {
  generation ??= createAiClient(resolveProviders(generationProviderList()), { timeoutMs: GENERATION_TIMEOUT_MS });
  return generation;
}

export function getSafetyAi(): AiClient {
  safety ??= createAiClient(resolveProviders(process.env.AI_SAFETY_PROVIDERS || DEFAULT_SAFETY_PROVIDERS), {
    timeoutMs: SAFETY_TIMEOUT_MS,
  });
  return safety;
}
