import { describe, expect, it } from "vitest";

import { sampleCase, sampleSource } from "./__fixtures__/sample-case";
import { finalizeCase } from "./finalize";
import { normalizeTopic, slugify } from "./topic";
import { verifyCase } from "./verify";

describe("finalizeCase", () => {
  it("moves the correct hypothesis away from its drafted position and keeps every reference consistent", () => {
    const drafted = sampleCase();
    const finalized = finalizeCase(drafted, () => 0);

    const correct = finalized.hypotheses.find((h) => h.correct);
    expect(correct?.text).toBe(drafted.hypotheses[0].text);
    expect(correct?.id).not.toBe("h1");
    expect(finalized.hypotheses.map((h) => h.id)).toEqual(["h1", "h2", "h3", "h4"]);
    expect(verifyCase(finalized, [sampleSource]).ok).toBe(true);
  });

  it("renames clue ids by position and remaps the solution", () => {
    const drafted = sampleCase();
    drafted.clues.forEach((clue, i) => (clue.id = `clue-${i}`));
    drafted.solution.forEach((s) => (s.clueIds = s.clueIds.map((id) => `clue-${Number(id.slice(1)) - 1}`)));

    const finalized = finalizeCase(drafted, () => 0.5);

    expect(finalized.clues.map((c) => c.id)).toEqual(["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"]);
    expect(finalized.solution[0].clueIds).toEqual(["c1", "c2"]);
    expect(verifyCase(finalized, [sampleSource]).ok).toBe(true);
  });
});

describe("normalizeTopic", () => {
  it("ignores case, punctuation and spacing", () => {
    expect(normalizeTopic("  Napoleon's   HUNDRED-Days! ")).toBe("napoleon s hundred days");
  });
});

describe("slugify", () => {
  it("builds a readable slug with a random suffix", () => {
    expect(slugify("How did Napoleon retake France in 20 days?", () => 0)).toBe("how-did-napoleon-retake-france-in-20-days-0000");
    expect(slugify("Ça va?!", () => 0.5)).toMatch(/^ca-va-[0-9a-z]{4}$/);
  });

  it("cuts a long title at a word boundary", () => {
    expect(slugify("How did a slab from a fortress wall unlock Egyptian hieroglyphs and change history?", () => 0)).toBe(
      "how-did-a-slab-from-a-fortress-wall-unlock-egyptian-0000",
    );
  });
});
