import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "./sliding-window";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows `limit` requests, then blocks", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1_000 });

    expect([1, 2, 3].map(() => limiter.check("ip").remaining)).toEqual([2, 1, 0]);
    expect(limiter.check("ip")).toEqual({ allowed: false, remaining: 0, resetMs: 1_000 });
  });

  it("slides the window instead of resetting it, and does not count denied requests", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });

    limiter.check("ip"); // t=0
    vi.setSystemTime(600);
    limiter.check("ip"); // t=600
    vi.setSystemTime(700);
    expect(limiter.check("ip")).toEqual({ allowed: false, remaining: 0, resetMs: 300 });

    vi.setSystemTime(1_001); // t=0 has left the window, t=600 has not
    expect(limiter.check("ip")).toEqual({ allowed: true, remaining: 0, resetMs: 599 });

    vi.setSystemTime(1_100);
    expect(limiter.check("ip")).toEqual({ allowed: false, remaining: 0, resetMs: 500 });
  });

  it("keeps keys isolated", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });

    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("starts a key fresh once all its requests have expired", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });

    limiter.check("a");
    vi.setSystemTime(5_000);
    expect(limiter.check("a")).toEqual({ allowed: true, remaining: 0, resetMs: 1_000 });
  });

  it.each([
    { limit: 0, windowMs: 1_000 },
    { limit: 1.5, windowMs: 1_000 },
    { limit: 1, windowMs: 0 },
  ])("rejects invalid options %j", (options) => {
    expect(() => createRateLimiter(options)).toThrow(RangeError);
  });
});
