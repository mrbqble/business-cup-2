import { beforeEach, describe, expect, it, vi } from "vitest";

import { sampleCase, sampleSource } from "@/lib/case/__fixtures__/sample-case";
import { countTopicCasesCreatedBy, findDailyCase } from "@/lib/db/cases";
import { findPlayerPlay, finishedDailyDays, playerRecord } from "@/lib/db/plays";
import type { PlayerRow, PlayRow } from "@/lib/db/schema";
import { authenticate, createAnonymousPlayer } from "@/lib/player/service";

import { GET as getMe } from "./me/route";
import { POST as createPlayer } from "./route";

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/lib/db/cases", () => ({ findDailyCase: vi.fn(), countTopicCasesCreatedBy: vi.fn() }));
vi.mock("@/lib/db/plays", () => ({ findPlayerPlay: vi.fn(), finishedDailyDays: vi.fn(), playerRecord: vi.fn() }));
vi.mock("@/lib/player/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/player/service")>()),
  authenticate: vi.fn(),
  createAnonymousPlayer: vi.fn(),
}));
vi.mock("@/lib/time", () => ({ todayDateKey: () => "2026-11-15" }));

const PLAYER: PlayerRow = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nickname: "Curious Otter", avatar: "🦦", tokenHash: "secret-hash", plan: "free" as const, planPeriod: null, planStartedAt: null, planExpiresAt: null, planCanceledAt: null, createdAt: new Date() };

describe("POST /api/players", () => {
  it("creates an anonymous player and returns its token once", async () => {
    vi.mocked(createAnonymousPlayer).mockResolvedValue({ player: { id: PLAYER.id, nickname: PLAYER.nickname, avatar: PLAYER.avatar }, token: "t".repeat(43) });

    const response = await createPlayer(new Request("http://test", { method: "POST", headers: { "x-forwarded-for": "198.51.100.20" } }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ player: { id: PLAYER.id, nickname: "Curious Otter", avatar: "🦦" }, token: "t".repeat(43) });
  });
});

describe("GET /api/players/me", () => {
  beforeEach(() => {
    vi.mocked(findDailyCase).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "broad-street",
      number: 2,
      kind: "daily",
      dateKey: "2026-11-15",
      content: sampleCase(),
      sources: [{ id: "S1", title: sampleSource.title, url: sampleSource.url, revisionId: sampleSource.revisionId }],
      exhibits: [],
      narration: null,
    });
  });

  it("requires a player token", async () => {
    vi.mocked(authenticate).mockResolvedValue(null);
    expect((await getMe(new Request("http://test"))).status).toBe(401);
  });

  it("reports the streak, rank, free topic case use and today's result, never the token hash", async () => {
    vi.mocked(authenticate).mockResolvedValue(PLAYER);
    vi.mocked(playerRecord).mockResolvedValue({ cases: 3, points: 1_600 });
    vi.mocked(finishedDailyDays).mockResolvedValue(["2026-11-14", "2026-11-15"]);
    vi.mocked(countTopicCasesCreatedBy).mockResolvedValue(1);
    vi.mocked(findPlayerPlay).mockResolvedValue({ status: "solved", score: 800 } as PlayRow);

    const response = await getMe(new Request("http://test", { headers: { authorization: "Bearer x" } }));
    const body = await response.json();

    expect(body).toEqual({
      player: { id: PLAYER.id, nickname: "Curious Otter", avatar: "🦦" },
      streak: 2,
      rank: { name: "Detective", level: 3, cases: 3, points: 1_600, next: { name: "Inspector", casesToGo: 4, pointsToGo: 2_400 } },
      plan: { plan: "free", period: null, startedAt: null, expiresAt: null, canceled: false },
      topicCases: { created: 1, free: 1, unlimited: false },
      today: { slug: "broad-street", status: "solved", score: 800 },
    });
    expect(JSON.stringify(body)).not.toContain("secret-hash");
  });
});
