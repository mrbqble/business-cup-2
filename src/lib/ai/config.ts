import "server-only";

import { createAnthropicProvider } from "./anthropic";
import { AiConfigError } from "./errors";
import { createMockProvider } from "./mock-provider";
import type { AiProvider } from "./types";

type Env = Record<string, string | undefined>;

const registry: Record<string, (env: Env) => AiProvider> = {
  mock: () => createMockProvider(),
  "claude-sonnet": (env) =>
    createAnthropicProvider({
      name: "claude-sonnet",
      model: "claude-sonnet-5-5",
      apiKey: anthropicKey(env),
      effort: "medium",
      refusalFallbacks: true,
    }),
  "claude-haiku": (env) =>
    createAnthropicProvider({
      name: "claude-haiku",
      model: "claude-haiku-5-5",
      apiKey: anthropicKey(env),
      effort: "medium",
      refusalFallbacks: false,
    }),
};

/** Resolves a comma-separated provider list (such as `AI_PROVIDERS`) into providers, in order. */
export function resolveProviders(value: string | undefined, env: Env = process.env): AiProvider[] {
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

  return names.map((name) => registry[name](env));
}

export function isAiConfigured(value: string | undefined, env: Env = process.env): boolean {
  try {
    resolveProviders(value, env);
    return true;
  } catch (error) {
    if (error instanceof AiConfigError) return false;
    throw error;
  }
}

function anthropicKey(env: Env): string {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) throw new AiConfigError("ANTHROPIC_API_KEY is not set");
  return key;
}
