import type { z } from "zod";

export interface AiRequest {
  system?: string;
  /** Long, stable text the request depends on, such as source articles; cached by providers that can. */
  context?: string;
  prompt: string;
  maxOutputTokens?: number;
  /** When set, the provider must answer with JSON text that matches this schema. */
  outputSchema?: z.ZodType;
}

export interface AiUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AiCompletion {
  text: string;
  usage?: AiUsage;
}

export interface AiProvider {
  readonly name: string;
  /** Must reject with `AiProviderError` for HTTP failures; any other rejection counts as a network error. */
  complete(request: AiRequest, signal: AbortSignal): Promise<AiCompletion>;
}

export interface AiResult {
  output: string;
  provider: string;
  /** Wall time of the whole call, including attempts that fell back. */
  latencyMs: number;
  fellBack: boolean;
  usage?: AiUsage;
}

export type AiFailureReason = "timeout" | "rate_limited" | "server_error" | "network";

export interface AiAttempt {
  provider: string;
  reason: AiFailureReason;
  status?: number;
  message: string;
}

export interface AiClient {
  complete(request: AiRequest): Promise<AiResult>;
}
