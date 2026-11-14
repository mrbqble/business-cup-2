import { describe, expect, it } from "vitest";

import { activePlan, canCreateTopicCase, caseAccess, periodEnd, type CaseAccessInput, type PlanState } from "./entitlements";

const NOW = new Date("2026-11-15T12:00:00Z");
const free: PlanState = { plan: "free", planPeriod: null, planStartedAt: null, planExpiresAt: null, planCanceledAt: null };
const plus: PlanState = {
  plan: "plus",
  planPeriod: "yearly",
  planStartedAt: new Date("2026-11-15T10:00:00Z"),
  planExpiresAt: new Date("2027-11-15T10:00:00Z"),
  planCanceledAt: null,
};

describe("activePlan", () => {
  it("keeps a paid plan until its period ends, even after a cancel", () => {
    expect(activePlan(free, NOW)).toBe("free");
    expect(activePlan(plus, NOW)).toBe("plus");
    expect(activePlan({ ...plus, planCanceledAt: NOW }, NOW)).toBe("plus");
    expect(activePlan({ ...plus, planExpiresAt: new Date("2026-11-15T11:59:59Z") }, NOW)).toBe("free");
    expect(activePlan({ ...plus, planExpiresAt: null }, NOW)).toBe("free");
  });

  it("ends a period one month or one year later", () => {
    expect(periodEnd(NOW, "monthly").toISOString()).toBe("2026-12-15T12:00:00.000Z");
    expect(periodEnd(NOW, "yearly").toISOString()).toBe("2027-11-15T12:00:00.000Z");
  });
});

describe("canCreateTopicCase", () => {
  it("gives free players one new topic case and Plus unlimited", () => {
    expect(canCreateTopicCase("free", 0)).toBe(true);
    expect(canCreateTopicCase("free", 1)).toBe(false);
    expect(canCreateTopicCase("plus", 25)).toBe(true);
  });
});

describe("caseAccess", () => {
  const base: CaseAccessInput = {
    kind: "daily",
    dateKey: "2026-11-15",
    today: "2026-11-15",
    todaysCaseDateKey: "2026-11-15",
    plan: "free",
    hasPlay: false,
    viaChallenge: false,
  };

  it("never puts today's case behind the paywall", () => {
    expect(caseAccess(base)).toEqual({ allowed: true });
  });

  it("serves the latest earlier case free when today's is missing", () => {
    expect(caseAccess({ ...base, dateKey: "2026-11-14", todaysCaseDateKey: "2026-11-14" })).toEqual({ allowed: true });
  });

  it("asks for Plus for past daily cases and archive cases", () => {
    expect(caseAccess({ ...base, dateKey: "2026-11-14" })).toEqual({ allowed: false, reason: "plus_required" });
    expect(caseAccess({ ...base, kind: "archive", dateKey: null })).toEqual({ allowed: false, reason: "plus_required" });
    expect(caseAccess({ ...base, kind: "archive", dateKey: null, plan: "plus" })).toEqual({ allowed: true });
  });

  it("never blocks a challenge, a cached topic case or a play already started", () => {
    expect(caseAccess({ ...base, kind: "archive", dateKey: null, viaChallenge: true })).toEqual({ allowed: true });
    expect(caseAccess({ ...base, dateKey: "2026-11-14", viaChallenge: true })).toEqual({ allowed: true });
    expect(caseAccess({ ...base, kind: "topic", dateKey: null })).toEqual({ allowed: true });
    expect(caseAccess({ ...base, dateKey: "2026-11-14", hasPlay: true })).toEqual({ allowed: true });
  });

  it("keeps future daily cases closed for everyone, Plus included", () => {
    expect(caseAccess({ ...base, dateKey: "2026-11-16", plan: "plus" })).toEqual({ allowed: false, reason: "not_yet_available" });
    expect(caseAccess({ ...base, dateKey: "2026-11-16", viaChallenge: true })).toEqual({ allowed: false, reason: "not_yet_available" });
  });
});
