import "server-only";

import type { RateLimitDecision } from "./sliding-window";

export function tooManyRequests(decision: RateLimitDecision): Response {
  const retryAfterSeconds = Math.max(1, Math.ceil(decision.resetMs / 1000));
  return Response.json(
    {
      error: "rate_limited",
      message: `Too many requests. Try again in ${retryAfterSeconds} s.`,
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" },
    },
  );
}
