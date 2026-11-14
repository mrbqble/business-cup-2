import "server-only";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the oldest counted request leaves the window. */
  resetMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitDecision;
}

/**
 * Sliding-window log limiter held in process memory.
 *
 * Best effort on serverless: each instance keeps its own Map, so the effective limit
 * scales with the number of warm instances and resets on cold start. The hard cost
 * ceiling is the provider-side spend cap, not this limiter.
 */
export function createRateLimiter({ limit, windowMs }: RateLimitOptions): RateLimiter {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError("limit must be a positive integer");
  if (!(windowMs > 0)) throw new RangeError("windowMs must be positive");

  const hits = new Map<string, number[]>();
  let lastSweep = Date.now();

  function sweepExpired(now: number) {
    if (now - lastSweep < windowMs) return;
    lastSweep = now;
    for (const [key, timestamps] of hits) {
      if (timestamps[timestamps.length - 1] <= now - windowMs) hits.delete(key);
    }
  }

  return {
    check(key) {
      const now = Date.now();
      sweepExpired(now);

      const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
      const allowed = recent.length < limit;
      if (allowed) recent.push(now);
      hits.set(key, recent);

      return {
        allowed,
        remaining: limit - recent.length,
        resetMs: recent[0] + windowMs - now,
      };
    },
  };
}
