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

/** The model declined the request. Not retried on another provider: the content is the problem. */
export class AiRefusalError extends Error {
  constructor(
    readonly provider: string,
    readonly category: string | null,
  ) {
    super(`${provider} declined the request${category ? ` (${category})` : ""}`);
    this.name = "AiRefusalError";
  }
}

/** The model answered, but not with output that passes validation. */
export class AiOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiOutputError";
  }
}

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}
