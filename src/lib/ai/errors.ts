import "server-only";

import type { AiAttempt } from "./types";

export class AiTimeoutError extends Error {
  constructor(
    readonly provider: string,
    readonly timeoutMs: number,
  ) {
    super(`${provider} did not answer within ${timeoutMs} ms`);
    this.name = "AiTimeoutError";
  }
}

/** An HTTP-level failure from a provider. `status` is undefined when no response arrived. */
export class AiProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly status: number | undefined,
    message: string,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export class AiAllProvidersFailedError extends Error {
  constructor(readonly attempts: readonly AiAttempt[]) {
    super(
      `All AI providers failed: ${attempts
        .map((a) => `${a.provider} (${a.reason}${a.status ? ` ${a.status}` : ""})`)
        .join(", ")}`,
    );
    this.name = "AiAllProvidersFailedError";
  }
}

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}
