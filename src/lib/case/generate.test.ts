import { describe, expect, it, vi } from "vitest";

import { createAiClient, type AiProvider } from "@/lib/ai";
import type { WikipediaClient } from "@/lib/sources/wikipedia";

import { sampleCase, sampleSource } from "./__fixtures__/sample-case";
import { generateCase, GenerationError, type GenerationEvent } from "./generate";

const filler = "\nThe outbreak is often cited in histories of public health and epidemiology.".repeat(20);

function fakeWikipedia(articles: Record<string, string>): WikipediaClient {
  return {
    search: vi.fn(async () => Object.keys(articles)),
    article: vi.fn(async (title: string) =>
      title in articles ? { title, url: `https://en.wikipedia.org/wiki/${title}`, revisionId: 42, text: articles[title] } : null,
    ),
  };
}

function scriptedAi(...outputs: unknown[]) {
  const provider = {
    name: "scripted",
    complete: vi.fn<AiProvider["complete"]>(async () => ({ text: JSON.stringify(outputs.shift() ?? {}) })),
  };
  return { provider, ai: createAiClient([provider], { timeoutMs: 1_000 }) };
}

const wikipedia = () =>
  fakeWikipedia({
    "Broad Street cholera outbreak (disambiguation)": "Broad Street cholera outbreak may refer to:" + filler,
    [sampleSource.title]: sampleSource.text + filler,
  });

const noPatch = { clues: [], hypotheses: [], title: null, solution: null, learned: null };

describe("generateCase", () => {
  it("drafts, repairs the failing clue in a targeted round and returns a verified, shuffled case", async () => {
    const draft = sampleCase();
    const goodQuote = draft.clues[4].quote;
    draft.clues[4].quote = "A widow in Hampstead loved the Broad Street water.";
    const { provider, ai } = scriptedAi(draft, { ...noPatch, clues: [{ ...draft.clues[4], quote: goodQuote }] });
    const events: GenerationEvent[] = [];

    const result = await generateCase("John Snow and the cholera pump", {
      ai,
      wikipedia: wikipedia(),
      onEvent: (e) => events.push(e),
      random: () => 0,
    });

    expect(events.map((e) => e.stage)).toEqual(["finding_sources", "drafting_clues", "checking_citations", "repairing"]);
    expect(result.verification.ok).toBe(true);
    expect(result.generation).toMatchObject({ providers: ["scripted"], repairRounds: 1 });
    expect(result.sources).toEqual([expect.objectContaining({ id: "S1", title: sampleSource.title, revisionId: 42 })]);
    expect(result.content.hypotheses.find((h) => h.correct)?.id).not.toBe("h1");

    const repairPrompt = provider.complete.mock.calls[1][0].prompt;
    expect(repairPrompt).toContain("clue c5 [quote_in_source]");
    expect(provider.complete.mock.calls[1][0].context).toBe(provider.complete.mock.calls[0][0].context);
  });

  it("gives up after two repair rounds that do not fix the case", async () => {
    const draft = sampleCase();
    draft.clues[4].quote = "Not in the source at all.";
    const { ai } = scriptedAi(draft, noPatch, noPatch);

    await expect(generateCase("John Snow", { ai, wikipedia: wikipedia() })).rejects.toMatchObject({
      name: "GenerationError",
      reason: "unverifiable",
    });
  });

  it("fails clearly when Wikipedia has no usable article", async () => {
    const { ai, provider } = scriptedAi(sampleCase());
    const empty = fakeWikipedia({ "Too short": "A stub." });

    await expect(generateCase("nothing here", { ai, wikipedia: empty })).rejects.toBeInstanceOf(GenerationError);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("skips disambiguation pages when choosing sources", async () => {
    const { provider, ai } = scriptedAi(sampleCase());

    await generateCase("John Snow", { ai, wikipedia: wikipedia() });

    const context = provider.complete.mock.calls[0][0].context ?? "";
    expect(context).toContain(`Source S1: ${sampleSource.title}`);
    expect(context).not.toContain("may refer to");
  });
});
