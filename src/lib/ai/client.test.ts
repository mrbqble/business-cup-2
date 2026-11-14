import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createAiClient } from "./client";
import { AiAllProvidersFailedError, AiProviderError } from "./errors";
import { createMockProvider, type MockBehavior } from "./mock-provider";
import type { AiProvider } from "./types";

const request = { prompt: "hello" };
const TIMEOUT_MS = 1_000;

function spied(provider: AiProvider) {
  return { name: provider.name, complete: vi.fn(provider.complete) };
}

function provider(name: string, behavior: MockBehavior) {
  return spied(createMockProvider(behavior, name));
}

describe("createAiClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("answers from the first provider without calling the rest", async () => {
    const primary = provider("primary", { kind: "succeed", output: "from primary" });
    const secondary = provider("secondary", { kind: "succeed" });
    const client = createAiClient([primary, secondary], { timeoutMs: TIMEOUT_MS });

    const result = await client.complete(request);

    expect(result).toMatchObject({ output: "from primary", provider: "primary", fellBack: false });
    expect(primary.complete).toHaveBeenCalledWith(request, expect.any(AbortSignal));
    expect(secondary.complete).not.toHaveBeenCalled();
  });

  it.each<[string, MockBehavior]>([
    ["429", { kind: "fail", status: 429 }],
    ["500", { kind: "fail", status: 500 }],
    ["503", { kind: "fail", status: 503 }],
    ["a network error", { kind: "network" }],
  ])("falls back to the next provider on %s", async (_, behavior) => {
    const primary = provider("primary", behavior);
    const secondary = provider("secondary", { kind: "succeed", output: "from secondary" });
    const client = createAiClient([primary, secondary], { timeoutMs: TIMEOUT_MS });

    const result = await client.complete(request);

    expect(result).toMatchObject({ output: "from secondary", provider: "secondary", fellBack: true });
    expect(primary.complete).toHaveBeenCalledOnce();
  });

  it("falls back on timeout, aborts the slow call and counts its time in latencyMs", async () => {
    let seenSignal: AbortSignal | undefined;
    const slow = spied({
      name: "slow",
      complete: (_, signal) => {
        seenSignal = signal;
        return createMockProvider({ kind: "hang" }).complete(request, signal);
      },
    });
    const secondary = provider("secondary", { kind: "succeed", output: "from secondary" });
    const client = createAiClient([slow, secondary], { timeoutMs: TIMEOUT_MS });

    const pending = client.complete(request);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await expect(pending).resolves.toEqual({
      output: "from secondary",
      provider: "secondary",
      latencyMs: TIMEOUT_MS,
      fellBack: true,
    });
    expect(seenSignal?.aborted).toBe(true);
  });

  it("times out a provider that ignores the abort signal", async () => {
    const stuck: AiProvider = { name: "stuck", complete: () => new Promise<string>(() => {}) };
    const secondary = provider("secondary", { kind: "succeed" });
    const client = createAiClient([stuck, secondary], { timeoutMs: TIMEOUT_MS });

    const pending = client.complete(request);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);

    await expect(pending).resolves.toMatchObject({ provider: "secondary", fellBack: true });
  });

  it.each([400, 401, 403, 422])("rethrows a %i without trying the next provider", async (status) => {
    const primary = provider("primary", { kind: "fail", status });
    const secondary = provider("secondary", { kind: "succeed" });
    const client = createAiClient([primary, secondary], { timeoutMs: TIMEOUT_MS });

    const error = await client.complete(request).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AiProviderError);
    expect(error).toMatchObject({ provider: "primary", status });
    expect(secondary.complete).not.toHaveBeenCalled();
  });

  it("lists every attempt when all providers fail", async () => {
    const client = createAiClient(
      [
        provider("first", { kind: "fail", status: 503 }),
        provider("second", { kind: "fail", status: 429 }),
        provider("third", { kind: "network" }),
        provider("fourth", { kind: "hang" }),
      ],
      { timeoutMs: TIMEOUT_MS },
    );

    const pending = client.complete(request);
    const assertion = expect(pending).rejects.toBeInstanceOf(AiAllProvidersFailedError);
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await assertion;

    const error = (await pending.catch((e: unknown) => e)) as AiAllProvidersFailedError;
    expect(error.attempts).toEqual([
      { provider: "first", reason: "server_error", status: 503, message: expect.any(String) },
      { provider: "second", reason: "rate_limited", status: 429, message: expect.any(String) },
      { provider: "third", reason: "network", message: "fetch failed" },
      { provider: "fourth", reason: "timeout", message: expect.stringContaining("1000 ms") },
    ]);
  });

  it("refuses an empty provider list", () => {
    expect(() => createAiClient([], { timeoutMs: TIMEOUT_MS })).toThrow(/at least one provider/);
  });
});
