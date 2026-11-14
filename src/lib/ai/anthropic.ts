import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

import { AiProviderError, AiRefusalError } from "./errors";
import type { AiCompletion, AiProvider, AiRequest } from "./types";

export interface AnthropicProviderOptions {
  name: string;
  model: string;
  apiKey: string;
  effort: "low" | "medium" | "high";
  /** Re-run a declined request on a fallback model inside the same call (not every model supports it). */
  refusalFallbacks: boolean;
}

const DEFAULT_MAX_OUTPUT_TOKENS = 32_000;

export function createAnthropicProvider(options: AnthropicProviderOptions): AiProvider {
  // One SDK retry absorbs a transient blip; anything longer is the provider chain's job.
  const client = new Anthropic({ apiKey: options.apiKey, maxRetries: 1 });

  return {
    name: options.name,
    async complete(request, signal): Promise<AiCompletion> {
      try {
        const message = await client.beta.messages
          .stream(
            {
              model: options.model,
              max_tokens: request.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
              system: systemBlocks(request),
              messages: [{ role: "user", content: request.prompt }],
              output_config: {
                effort: options.effort,
                ...(request.outputSchema ? { format: zodOutputFormat(request.outputSchema) } : {}),
              },
              ...(options.refusalFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
            },
            { signal },
          )
          .finalMessage();

        if (message.stop_reason === "refusal") {
          throw new AiRefusalError(options.name, message.stop_details?.category ?? null);
        }
        return {
          text: message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(""),
          usage: {
            model: message.model,
            inputTokens: message.usage.input_tokens,
            outputTokens: message.usage.output_tokens,
            cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
            cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
          },
        };
      } catch (error) {
        if (error instanceof Anthropic.APIError) throw new AiProviderError(options.name, error.status, error.message);
        throw error;
      }
    },
  };
}

/** Instructions first, then the long context with a cache breakpoint, so retries reuse the cached prefix. */
function systemBlocks(request: AiRequest): Anthropic.Beta.BetaTextBlockParam[] {
  const blocks: Anthropic.Beta.BetaTextBlockParam[] = [];
  if (request.system) blocks.push({ type: "text", text: request.system });
  if (request.context) blocks.push({ type: "text", text: request.context, cache_control: { type: "ephemeral" } });
  return blocks;
}
