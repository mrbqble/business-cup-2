import { describe, expect, it } from "vitest";

import { tooManyRequests } from "./response";

describe("tooManyRequests", () => {
  it("returns a 429 with Retry-After rounded up to whole seconds", async () => {
    const response = tooManyRequests({ allowed: false, remaining: 0, resetMs: 1_500 });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("2");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ error: "rate_limited", retryAfterSeconds: 2 });
  });

  it("never asks the client to retry in less than a second", () => {
    expect(tooManyRequests({ allowed: false, remaining: 0, resetMs: 0 }).headers.get("retry-after")).toBe("1");
  });
});
