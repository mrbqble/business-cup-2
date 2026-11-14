import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiAllProvidersFailedError } from "@/lib/ai";
import { sampleCase, sampleSource } from "@/lib/case/__fixtures__/sample-case";
import { checkTopicSafety } from "@/lib/case/safety";
import type { CaseRecord } from "@/lib/case/schema";
import { createCase } from "@/lib/case/service";
import { countTopicCasesCreatedBy, findCaseBySlug, findDailyCase, findTopicCase } from "@/lib/db/cases";
import { caseLeaderboard } from "@/lib/db/leaderboard";
import type { PlayerRow } from "@/lib/db/schema";
import { authenticate } from "@/lib/player/service";

import { GET as getLeaderboard } from "./[slug]/leaderboard/route";
import { GET as getCase } from "./[slug]/route";
import { POST as generate } from "./generate/route";
import { GET as getToday } from "./today/route";

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/lib/db/cases", () => ({
  findDailyCase: vi.fn(),
  findCaseBySlug: vi.fn(),
  findTopicCase: vi.fn(),
  countTopicCasesCreatedBy: vi.fn(),
}));
vi.mock("@/lib/db/leaderboard", () => ({ caseLeaderboard: vi.fn() }));
vi.mock("@/lib/player/service", () => ({ authenticate: vi.fn() }));
vi.mock("@/lib/case/service", () => ({ createCase: vi.fn() }));
vi.mock("@/lib/case/safety", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/case/safety")>()),
  checkTopicSafety: vi.fn(),
}));
vi.mock("@/lib/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai")>()),
  getSafetyAi: vi.fn(),
}));

const record: CaseRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "broad-street",
  number: 2,
  kind: "daily",
  dateKey: "2026-11-15",
  content: sampleCase(),
  sources: [{ id: "S1", title: sampleSource.title, url: sampleSource.url, revisionId: sampleSource.revisionId }],
  exhibits: [],
  narration: null,
};

const PLAYER: PlayerRow = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nickname: "Curious Otter", avatar: "🦦", tokenHash: "x", createdAt: new Date() };

function generateRequest(topic: unknown, ip = "203.0.113.1", token: string | null = "player-token") {
  return new Request("http://test/api/cases/generate", {
    method: "POST",
    headers: { "x-forwarded-for": ip, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ topic }),
  });
}

async function events(response: Response) {
  return (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { type: string; [key: string]: unknown });
}

describe("GET /api/cases/today and /api/cases/[slug]", () => {
  it("serves today's case as a public view with no answer data", async () => {
    vi.mocked(findDailyCase).mockResolvedValue(record);

    const response = await getToday();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.view.case).toMatchObject({ slug: "broad-street", number: 2, title: record.content.title });
    expect(JSON.stringify(body)).not.toMatch(/"(correct|supports|refutes|solution|learned)"/);
    expect(vi.mocked(findDailyCase).mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("answers 404 when no case exists yet", async () => {
    vi.mocked(findDailyCase).mockResolvedValue(null);
    expect((await getToday()).status).toBe(404);
  });

  it("serves a case by slug, or 404", async () => {
    vi.mocked(findCaseBySlug).mockImplementation(async (slug) => (slug === "broad-street" ? record : null));
    expect((await getCase(new Request("http://test"), { params: Promise.resolve({ slug: "broad-street" }) })).status).toBe(200);
    expect((await getCase(new Request("http://test"), { params: Promise.resolve({ slug: "nope" }) })).status).toBe(404);
  });
});

describe("GET /api/cases/[slug]/leaderboard", () => {
  it("returns the top entries and the asking player's rank without exposing player ids", async () => {
    vi.mocked(findCaseBySlug).mockResolvedValue(record);
    vi.mocked(authenticate).mockResolvedValue(PLAYER);
    const top = { rank: 1, playerId: "other", nickname: "Bold Fox", avatar: "🦊", score: 900, solved: true, durationMs: 60_000 };
    const you = { rank: 57, playerId: PLAYER.id, nickname: PLAYER.nickname, avatar: PLAYER.avatar, score: 300, solved: true, durationMs: 90_000 };
    vi.mocked(caseLeaderboard).mockResolvedValue({ entries: [top], you, total: 80 });

    const response = await getLeaderboard(new Request("http://test", { headers: { authorization: "Bearer t" } }), {
      params: Promise.resolve({ slug: "broad-street" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(caseLeaderboard).mock.calls[0]).toEqual([record.id, PLAYER.id]);
    expect(body).toMatchObject({ total: 80, entries: [{ rank: 1, nickname: "Bold Fox", isYou: false }], you: { rank: 57, isYou: true } });
    expect(JSON.stringify(body)).not.toContain("playerId");
  });
});

describe("POST /api/cases/generate", () => {
  beforeEach(() => {
    vi.mocked(findTopicCase).mockResolvedValue(null);
    vi.mocked(checkTopicSafety).mockResolvedValue({ allowed: true });
    vi.mocked(countTopicCasesCreatedBy).mockResolvedValue(0);
    vi.mocked(authenticate).mockImplementation(async (req) => (req.headers.get("authorization") ? PLAYER : null));
  });

  it("requires a player token", async () => {
    expect((await generate(generateRequest("The Rosetta Stone", "198.51.100.9", null))).status).toBe(401);
    expect(createCase).not.toHaveBeenCalled();
  });

  it("refuses a second new topic case for the same player, politely, but still opens cached topics", async () => {
    vi.mocked(countTopicCasesCreatedBy).mockResolvedValue(1);

    const limited = await generate(generateRequest("The Rosetta Stone", "198.51.100.8"));
    expect(limited.status).toBe(403);
    expect(await limited.json()).toMatchObject({ error: "topic_limit" });
    expect(createCase).not.toHaveBeenCalled();

    vi.mocked(findTopicCase).mockResolvedValue({ ...record, slug: "cached-case" });
    expect(await events(await generate(generateRequest("The Rosetta Stone", "198.51.100.8")))).toEqual([{ type: "done", slug: "cached-case" }]);
  });

  it("streams progress and finishes with the new case's slug", async () => {
    vi.mocked(createCase).mockImplementation(async ({ onEvent }) => {
      onEvent?.({ stage: "finding_sources", message: "Finding sources on Wikipedia" });
      onEvent?.({ stage: "checking_citations", message: "Checking every quote against the sources" });
      return { ...record, kind: "topic", slug: "rosetta" };
    });

    const response = await generate(generateRequest("The Rosetta Stone", "198.51.100.1"));

    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    expect(await events(response)).toEqual([
      { type: "progress", stage: "finding_sources", message: "Finding sources on Wikipedia" },
      { type: "progress", stage: "checking_citations", message: "Checking every quote against the sources" },
      { type: "done", slug: "rosetta" },
    ]);
    expect(vi.mocked(createCase).mock.calls[0][0]).toMatchObject({ topic: "The Rosetta Stone", kind: "topic", createdBy: PLAYER.id });
  });

  it("returns a cached topic at once without generating or using the rate limit", async () => {
    vi.mocked(findTopicCase).mockResolvedValue({ ...record, slug: "cached-case" });

    for (let i = 0; i < 5; i++) {
      expect(await events(await generate(generateRequest("the rosetta stone!", "198.51.100.2")))).toEqual([{ type: "done", slug: "cached-case" }]);
    }
    expect(createCase).not.toHaveBeenCalled();
    expect(vi.mocked(findTopicCase).mock.calls[0][0]).toBe("the rosetta stone");
  });

  it("refuses unsafe topics before any model call", async () => {
    const response = await generate(generateRequest("medieval torture methods"));
    expect(response.status).toBe(422);
    expect(checkTopicSafety).not.toHaveBeenCalled();
  });

  it("streams the classifier's refusal politely", async () => {
    vi.mocked(checkTopicSafety).mockResolvedValue({ allowed: false, reason: "Sports results are not a mystery.", retryable: false });
    expect(await events(await generate(generateRequest("Super Bowl winners", "198.51.100.3")))).toEqual([
      { type: "refused", message: "Sports results are not a mystery.", retryable: false },
    ]);
    expect(createCase).not.toHaveBeenCalled();
  });

  it("limits each IP to 3 new generations an hour", async () => {
    vi.mocked(createCase).mockResolvedValue(record);
    const ip = "198.51.100.4";
    for (let i = 0; i < 3; i++) expect((await generate(generateRequest(`topic number ${i}`, ip))).status).toBe(200);

    const limited = await generate(generateRequest("topic number 4", ip));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
  });

  it("streams a friendly, retryable failure when the model providers are down", async () => {
    vi.mocked(createCase).mockRejectedValue(new AiAllProvidersFailedError([]));
    expect(await events(await generate(generateRequest("The Rosetta Stone", "198.51.100.5")))).toEqual([
      { type: "failed", message: "The case writer is busy right now. Please try again in a minute.", retryable: true },
    ]);
  });

  it("rejects a malformed body", async () => {
    expect((await generate(generateRequest(42))).status).toBe(400);
  });
});
