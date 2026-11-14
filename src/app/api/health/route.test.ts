import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, type HealthResponse } from "./route";

// connection() needs a Next request scope; that the route renders per request is checked in the build output.
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));

async function readHealth() {
  const response = await GET();
  return { response, body: (await response.json()) as HealthResponse };
}

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports the deployed commit, environment and AI config without caching", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AI_PROVIDERS", "mock");

    const { response, body } = await readHealth();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      ok: true,
      commit: "abc123",
      env: "production",
      deps: { ai: "configured" },
      time: expect.any(String),
    });
    expect(new Date(body.time).toISOString()).toBe(body.time);
  });

  it("falls back to local values outside Vercel", async () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);

    const { body } = await readHealth();

    expect(body).toMatchObject({ commit: "local", env: "development" });
  });

  it.each([undefined, "nope"])("stays ok but reports ai missing when AI_PROVIDERS is %j", async (value) => {
    vi.stubEnv("AI_PROVIDERS", value);

    const { response, body } = await readHealth();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, deps: { ai: "missing" } });
  });
});
