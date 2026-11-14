import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createAiClient } from "./client";
import { AiOutputError } from "./errors";
import { estimateCostUsd } from "./pricing";
import { generateObject } from "./structured";
import type { AiProvider } from "./types";

const schema = z.object({ answer: z.string() });

function scripted(...outputs: string[]) {
  const provider = {
    name: "scripted",
    complete: vi.fn<AiProvider["complete"]>(async () => ({ text: outputs.shift() ?? "" })),
  };
  return { provider, client: createAiClient([provider], { timeoutMs: 1_000 }) };
}

describe("generateObject", () => {
  it("returns the parsed value after one call when the output is valid", async () => {
    const { provider, client } = scripted('{"answer":"42"}');

    const result = await generateObject(client, { prompt: "Q" }, schema);

    expect(result.value).toEqual({ answer: "42" });
    expect(result.calls).toHaveLength(1);
    expect(provider.complete.mock.calls[0][0].outputSchema).toBe(schema);
  });

  it("repairs once, quoting the invalid answer and the reason", async () => {
    const { provider, client } = scripted('{"answer":', '{"answer":"42"}');

    const result = await generateObject(client, { prompt: "Q" }, schema);

    expect(result.value).toEqual({ answer: "42" });
    expect(result.calls).toHaveLength(2);
    const repairPrompt = provider.complete.mock.calls[1][0].prompt;
    expect(repairPrompt).toContain("not valid JSON");
    expect(repairPrompt).toContain('{"answer":');
  });

  it("also repairs JSON that does not match the schema", async () => {
    const { client } = scripted('{"answer":42}', '{"answer":"42"}');
    await expect(generateObject(client, { prompt: "Q" }, schema)).resolves.toMatchObject({ value: { answer: "42" } });
  });

  it("gives up after the repair attempt fails", async () => {
    const { client } = scripted("nope", "still nope");
    await expect(generateObject(client, { prompt: "Q" }, schema)).rejects.toBeInstanceOf(AiOutputError);
  });
});

describe("estimateCostUsd", () => {
  it("prices input, output and cache tokens per million", () => {
    const usage = { model: "claude-sonnet-5-5", inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 };
    expect(estimateCostUsd([usage])).toBeCloseTo(2 + 1 + 0.1);
  });

  it("returns null when a call has no usage or an unknown model", () => {
    expect(estimateCostUsd([undefined])).toBeNull();
    expect(estimateCostUsd([{ model: "other", inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 }])).toBeNull();
  });
});
