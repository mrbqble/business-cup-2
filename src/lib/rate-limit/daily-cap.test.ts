import { describe, expect, it } from "vitest";

import { DEFAULT_GENERATION_DAILY_CAP, generationDailyCap } from "./daily-cap";

describe("generationDailyCap", () => {
  it("defaults to 40 and reads a whole number from the environment", () => {
    expect(DEFAULT_GENERATION_DAILY_CAP).toBe(40);
    expect(generationDailyCap({})).toBe(40);
    expect(generationDailyCap({ GENERATION_DAILY_CAP: "12" })).toBe(12);
    expect(generationDailyCap({ GENERATION_DAILY_CAP: "0" })).toBe(0);
  });

  it("ignores values that aren't whole numbers", () => {
    expect(generationDailyCap({ GENERATION_DAILY_CAP: "-5" })).toBe(40);
    expect(generationDailyCap({ GENERATION_DAILY_CAP: "lots" })).toBe(40);
    expect(generationDailyCap({ GENERATION_DAILY_CAP: " " })).toBe(40);
  });
});
