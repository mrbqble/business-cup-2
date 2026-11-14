import { describe, expect, it } from "vitest";

import { canCreateTopicCase, FREE_TOPIC_CASES } from "./entitlements";
import { randomIdentity } from "./names";
import { bearerToken, hashToken, newPlayerToken } from "./token";

describe("randomIdentity", () => {
  it("builds a two-word nickname and an emoji avatar from fixed lists", () => {
    expect(randomIdentity(() => 0)).toEqual({ nickname: "Curious Otter", avatar: "🦦" });
    expect(randomIdentity(() => 0.999)).toEqual({ nickname: "Bright Bee", avatar: "🐝" });
  });
});

describe("player tokens", () => {
  it("are long, random and stored only as a stable hash", () => {
    const token = newPlayerToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newPlayerToken()).not.toBe(token);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });

  it("are read from a well-formed Bearer header only", () => {
    const token = newPlayerToken();
    expect(bearerToken(new Headers({ authorization: `Bearer ${token}` }))).toBe(token);
    expect(bearerToken(new Headers({ authorization: `Basic ${token}` }))).toBeNull();
    expect(bearerToken(new Headers({ authorization: "Bearer short" }))).toBeNull();
    expect(bearerToken(new Headers())).toBeNull();
  });
});

describe("canCreateTopicCase", () => {
  it("allows exactly the free topic cases", () => {
    expect(FREE_TOPIC_CASES).toBe(1);
    expect(canCreateTopicCase(0)).toBe(true);
    expect(canCreateTopicCase(1)).toBe(false);
  });
});
