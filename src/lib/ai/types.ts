export interface AiRequest {
  prompt: string;
  system?: string;
  maxOutputTokens?: number;
}

export interface AiProvider {
  readonly name: string;
  /** Must reject with `AiProviderError` for HTTP failures; any other rejection counts as a network error. */
  complete(request: AiRequest, signal: AbortSignal): Promise<string>;
}

export interface AiResult {
  output: string;
  provider: string;
  /** Wall time of the whole call, including attempts that fell back. */
  latencyMs: number;
  fellBack: boolean;
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
