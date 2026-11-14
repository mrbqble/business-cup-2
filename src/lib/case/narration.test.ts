import { describe, expect, it, vi } from "vitest";

import { createAiClient, type AiProvider } from "@/lib/ai";

import { sampleCase } from "./__fixtures__/sample-case";
import { writeNarration } from "./narrate";
import { checkNarration, fallbackNarration, type Narration } from "./narration";

const clean: Narration = {
  setting: "London, 1854. Cholera is sweeping through the Soho streets.",
  mystery: "Somewhere in Soho, something is spreading the disease. Most of the deaths cluster around one public pump.",
  task: "Your job, Detective: weigh the evidence and decide how John Snow found the source.",
  closing: "The pump on Broad Street was the culprit: a widow in Hampstead who drank its water died too.",
};

describe("checkNarration", () => {
  it("accepts narration that only restates the case", () => {
    expect(checkNarration(clean, sampleCase())).toEqual([]);
  });

  it("rejects intro names that only sealed evidence mentions, but allows them in the closing", () => {
    const issues = checkNarration({ ...clean, mystery: "A widow far away in Hampstead may hold the key." }, sampleCase());
    expect(issues).toEqual([{ part: "mystery", problem: "unknown_name", detail: "Hampstead" }]);
  });

  it("rejects names and years the case never mentions", () => {
    const issues = checkNarration({ setting: "In 1849 Florence Nightingale toured London." }, sampleCase());
    expect(issues.map((i) => [i.problem, i.detail])).toEqual([
      ["unknown_year", "1849"],
      ["unknown_name", "Florence"],
      ["unknown_name", "Nightingale"],
    ]);
  });

  it("rejects invented dialogue and overlong panels", () => {
    expect(checkNarration({ task: 'Snow said, "Remove the handle."' }, sampleCase())[0]).toMatchObject({ problem: "dialogue" });
    expect(checkNarration({ setting: "London. ".repeat(40) }, sampleCase())[0]).toMatchObject({ problem: "length" });
    expect(checkNarration({ closing: "  " }, sampleCase())[0]).toMatchObject({ problem: "length" });
  });

  it("reads common sentence openers and possessives as ordinary words", () => {
    expect(checkNarration({ task: "Nobody knows yet. Weigh Snow's map. Then accuse." }, sampleCase())).toEqual([]);
  });

  it("builds a fallback that passes its own check", () => {
    expect(checkNarration(fallbackNarration(sampleCase()), sampleCase())).toEqual([]);
  });
});

function scriptedAi(...outputs: unknown[]) {
  const provider = {
    name: "scripted",
    complete: vi.fn<AiProvider["complete"]>(async () => ({ text: JSON.stringify(outputs.shift() ?? {}) })),
  };
  return { provider, ai: createAiClient([provider], { timeoutMs: 1_000 }) };
}

describe("writeNarration", () => {
  it("never shows the intro writer which theory is right, or the solution", async () => {
    const content = sampleCase();
    const { provider, ai } = scriptedAi(
      { setting: clean.setting, mystery: clean.mystery, task: clean.task },
      { closing: clean.closing },
    );
    const result = await writeNarration(ai, content);

    expect(result.narration).toEqual(clean);
    expect(result.fallbackParts).toEqual([]);
    const prompts = provider.complete.mock.calls.map(([request]) => `${request.system}\n${request.prompt}`);
    const intro = prompts.find((p) => p.includes("opening narration"))!;
    const closing = prompts.find((p) => p.includes("closing caption"))!;
    expect(intro).not.toContain(content.solution[0].text);
    expect(intro).not.toContain("Answer:");
    expect(intro).not.toContain(content.clues[4].quote);
    expect(closing).toContain("Answer: Contaminated water from the Broad Street pump spread the disease.");
  });

  it("asks again with the checker's findings, then falls back to the case's own words", async () => {
    const content = sampleCase();
    const leaky = { setting: "Hampstead, 1854.", mystery: clean.mystery, task: clean.task };
    const { provider, ai } = scriptedAi(leaky, { closing: clean.closing }, leaky);
    const result = await writeNarration(ai, content);

    expect(result.fallbackParts).toEqual(["setting", "mystery", "task"]);
    expect(result.narration.setting).toBe(fallbackNarration(content).setting);
    expect(result.narration.closing).toBe(clean.closing);
    const retry = provider.complete.mock.calls.map(([request]) => request.prompt).find((p) => p.includes("rejected by the checker"));
    expect(retry).toContain("setting unknown name (Hampstead)");
  });

  it("falls back when the model is unavailable", async () => {
    const provider: AiProvider = { name: "down", complete: async () => Promise.reject(new TypeError("fetch failed")) };
    const result = await writeNarration(createAiClient([provider], { timeoutMs: 1_000 }), sampleCase());
    expect(result.narration).toEqual(fallbackNarration(sampleCase()));
    expect(result.fallbackParts).toHaveLength(4);
  });
});
