import { describe, expect, it } from "vitest";

import { isAiConfigured, resolveProviders } from "./config";
import { AiConfigError } from "./errors";

describe("resolveProviders", () => {
  it("resolves names in order and ignores surrounding whitespace", () => {
    expect(resolveProviders(" mock , mock ").map((p) => p.name)).toEqual(["mock", "mock"]);
  });

  it.each([undefined, "", " , "])("fails fast when AI_PROVIDERS is %j", (value) => {
    expect(() => resolveProviders(value)).toThrow(AiConfigError);
  });

  it("names the unknown provider and the known ones", () => {
    expect(() => resolveProviders("mock,openai")).toThrow(
      "Unknown AI provider(s) in AI_PROVIDERS: openai. Known: mock",
    );
  });

  it.each(["constructor", "toString", "__proto__"])("does not resolve the inherited name %s", (name) => {
    expect(() => resolveProviders(name)).toThrow(AiConfigError);
  });

  it("needs ANTHROPIC_API_KEY for the Claude providers", () => {
    expect(() => resolveProviders("claude-sonnet,claude-haiku", {})).toThrow("ANTHROPIC_API_KEY is not set");
    expect(
      resolveProviders("claude-sonnet,claude-haiku", { ANTHROPIC_API_KEY: "test-key" }).map((p) => p.name),
    ).toEqual(["claude-sonnet", "claude-haiku"]);
  });
});

describe("isAiConfigured", () => {
  it("is true only when every name resolves", () => {
    expect(isAiConfigured("mock")).toBe(true);
    expect(isAiConfigured("mock,nope")).toBe(false);
    expect(isAiConfigured(undefined)).toBe(false);
    expect(isAiConfigured("claude-haiku", {})).toBe(false);
  });
});
