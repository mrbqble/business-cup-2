import { describe, expect, it } from "vitest";

import { createAiClient, createMockProvider } from "@/lib/ai";

import { checkTopicRules, checkTopicSafety } from "./safety";

describe("checkTopicRules", () => {
  it.each([
    "Napoleon's Hundred Days",
    "How was the Rosetta Stone deciphered?",
    "The 1854 Broad Street cholera outbreak",
    "Why did the Vasa sink in 1628?",
    "The 2019 image of a black hole",
  ])("allows %j", (topic) => {
    expect(checkTopicRules(topic)).toEqual({ allowed: true });
  });

  it.each([
    ["too short", "ab"],
    ["too long", "a".repeat(121)],
    ["no letters", "1854 !!!"],
    ["sexual content", "the history of porn"],
    ["graphic violence", "medieval torture methods"],
    ["self-harm", "famous suicide notes"],
    ["current politics", "Biden vs Trump"],
    ["a recent tragedy by name", "the 9/11 attacks"],
    ["a recent tragedy by year", "the 2011 tsunami in Japan"],
    ["a recent pandemic", "where COVID came from"],
  ])("refuses %s", (_, topic) => {
    expect(checkTopicRules(topic)).toMatchObject({ allowed: false, retryable: false });
  });
});

describe("checkTopicSafety", () => {
  const client = (output: string) => createAiClient([createMockProvider({ kind: "succeed", output })], { timeoutMs: 1_000 });

  it("does not call the model when a rule already refuses the topic", async () => {
    const verdict = await checkTopicSafety("medieval torture methods", client("not json"));
    expect(verdict).toMatchObject({ allowed: false, retryable: false });
  });

  it("follows the classifier for topics the rules let through", async () => {
    await expect(checkTopicSafety("the Rosetta Stone", client('{"allowed":true,"reason":""}'))).resolves.toEqual({ allowed: true });
    await expect(
      checkTopicSafety("who will win the Super Bowl", client('{"allowed":false,"reason":"Sports results are not a history or science mystery."}')),
    ).resolves.toEqual({ allowed: false, reason: "Sports results are not a history or science mystery.", retryable: false });
  });

  it("refuses politely and allows a retry when the classifier is unavailable", async () => {
    const down = createAiClient([createMockProvider({ kind: "fail", status: 503 })], { timeoutMs: 1_000 });
    await expect(checkTopicSafety("the Rosetta Stone", down)).resolves.toMatchObject({ allowed: false, retryable: true });
  });
});
