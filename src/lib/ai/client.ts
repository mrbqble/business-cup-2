import "server-only";

import { AiAllProvidersFailedError, AiProviderError, AiRefusalError, AiTimeoutError } from "./errors";
import type { AiAttempt, AiClient, AiCompletion, AiProvider, AiRequest } from "./types";

export interface AiClientOptions {
  /** Per-provider attempt timeout. */
  timeoutMs: number;
}

export function createAiClient(
  providers: readonly AiProvider[],
  { timeoutMs }: AiClientOptions,
): AiClient {
  if (providers.length === 0) {
    throw new Error("createAiClient needs at least one provider");
  }

  return {
    async complete(request: AiRequest) {
      const startedAt = Date.now();
      const attempts: AiAttempt[] = [];

      for (const provider of providers) {
        try {
          const completion = await withTimeout(provider, request, timeoutMs);
          return {
            output: completion.text,
            provider: provider.name,
            latencyMs: Date.now() - startedAt,
            fellBack: attempts.length > 0,
            usage: completion.usage,
          };
        } catch (error) {
          const attempt = toFallbackAttempt(provider.name, error);
          if (!attempt) throw error;
          attempts.push(attempt);
        }
      }

      throw new AiAllProvidersFailedError(attempts);
    },
  };
}

async function withTimeout(
  provider: AiProvider,
  request: AiRequest,
  timeoutMs: number,
): Promise<AiCompletion> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new AiTimeoutError(provider.name, timeoutMs);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });

  try {
    // Racing, rather than trusting the provider to honour the signal, bounds providers that hang.
    return await Promise.race([provider.complete(request, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Returns the attempt record when the error warrants trying the next provider, otherwise null. */
function toFallbackAttempt(provider: string, error: unknown): AiAttempt | null {
  if (error instanceof AiRefusalError) return null;
  if (error instanceof AiTimeoutError) {
    return { provider, reason: "timeout", message: error.message };
  }
  if (error instanceof AiProviderError) {
    const { status } = error;
    if (status === undefined) return { provider, reason: "network", message: error.message };
    if (status === 429) return { provider, reason: "rate_limited", status, message: error.message };
    if (status >= 500) return { provider, reason: "server_error", status, message: error.message };
    return null;
  }
  const message = error instanceof Error ? error.message : String(error);
  return { provider, reason: "network", message };
}
