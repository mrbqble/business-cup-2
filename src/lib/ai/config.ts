import "server-only";

import { AiConfigError } from "./errors";
import { createMockProvider } from "./mock-provider";
import type { AiProvider } from "./types";

const registry: Record<string, () => AiProvider> = {
  mock: () => createMockProvider(),
};

/** Resolves the comma-separated `AI_PROVIDERS` value into providers, in order. */
export function resolveProviders(value: string | undefined): AiProvider[] {
  const names = (value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (names.length === 0) {
    throw new AiConfigError("AI_PROVIDERS is empty; expected a comma-separated list such as \"mock\"");
  }

  const unknown = names.filter((name) => !Object.hasOwn(registry, name));
  if (unknown.length > 0) {
    throw new AiConfigError(
      `Unknown AI provider(s) in AI_PROVIDERS: ${unknown.join(", ")}. Known: ${Object.keys(registry).join(", ")}`,
    );
  }

  return names.map((name) => registry[name]());
}

export function isAiConfigured(value: string | undefined): boolean {
  try {
    resolveProviders(value);
    return true;
  } catch (error) {
    if (error instanceof AiConfigError) return false;
    throw error;
  }
}
