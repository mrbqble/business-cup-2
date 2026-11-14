import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkDatabase } from "@/lib/db/health";

import { GET, type HealthResponse } from "./route";

// connection() needs a Next request scope; that the route renders per request is checked in the build output.
vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/lib/db/health", () => ({ checkDatabase: vi.fn() }));

async function readHealth() {
  const response = await GET();
  return { response, body: (await response.json()) as HealthResponse };
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.mocked(checkDatabase).mockResolvedValue("ok");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports the deployed commit, environment, database and AI config without caching", async () => {
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
      deps: { db: "ok", ai: "configured", aiProviders: ["mock"] },
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

  it("is not ok, with a 503, when the database does not answer", async () => {
    vi.mocked(checkDatabase).mockResolvedValue("failed");

    const { response, body } = await readHealth();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({ ok: false, deps: { db: "failed" } });
  });

  it("defaults to the Claude chain and reports it missing without an API key", async () => {
    vi.stubEnv("AI_PROVIDERS", undefined);
    vi.stubEnv("ANTHROPIC_API_KEY", undefined);

    const { response, body } = await readHealth();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, deps: { ai: "missing", aiProviders: ["claude-sonnet", "claude-haiku"] } });
  });

  it("reports an unknown provider as missing", async () => {
    vi.stubEnv("AI_PROVIDERS", "nope");
    const { body } = await readHealth();
    expect(body.deps.ai).toBe("missing");
  });
});
