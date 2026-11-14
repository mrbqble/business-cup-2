import { describe, expect, it } from "vitest";

import { normalizeTopic, slugify, topicLookupKeys } from "./topic";

describe("normalizeTopic", () => {
  it("ignores case, punctuation and spacing", () => {
    expect(normalizeTopic("  The Rosetta   Stone! ")).toBe("the rosetta stone");
    expect(normalizeTopic("Mary-Celeste")).toBe("mary celeste");
  });
});

describe("topicLookupKeys", () => {
  it("finds a cached topic with or without a leading article", () => {
    expect(topicLookupKeys("Cardiff Giant")).toEqual(["cardiff giant", "the cardiff giant"]);
    expect(topicLookupKeys("The Cardiff Giant")).toEqual(["the cardiff giant", "cardiff giant"]);
    expect(topicLookupKeys("an Antikythera mechanism")).toEqual(["an antikythera mechanism", "antikythera mechanism", "the antikythera mechanism"]);
  });
});

describe("slugify", () => {
  it("makes a URL-safe slug with a random suffix", () => {
    expect(slugify("Why did the Vasa sink?", () => 0)).toBe("why-did-the-vasa-sink-0000");
  });
});
