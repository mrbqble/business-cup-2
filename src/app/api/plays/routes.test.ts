import { beforeEach, describe, expect, it, vi } from "vitest";

import { sampleCase, sampleSource } from "@/lib/case/__fixtures__/sample-case";
import type { CaseRecord } from "@/lib/case/schema";
import type { PlayView } from "@/lib/case/view";
import { findCaseById, findCaseBySlug } from "@/lib/db/cases";
import { appendAction, findPlay, startPlayerPlay } from "@/lib/db/plays";
import type { PlayerRow, PlayRow } from "@/lib/db/schema";
import { authenticate } from "@/lib/player/service";

import { GET as getPlay } from "./[id]/route";
import { POST as postAction } from "./[id]/actions/route";
import { POST as postPlay } from "./route";

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/lib/db/cases", () => ({ findCaseBySlug: vi.fn(), findCaseById: vi.fn() }));
vi.mock("@/lib/db/plays", () => ({
  startPlayerPlay: vi.fn(),
  findPlay: vi.fn(),
  appendAction: vi.fn(),
  playerRecord: vi.fn(async () => ({ cases: 1, points: 700 })),
}));
vi.mock("@/lib/db/players", () => ({ findPlayerById: vi.fn() }));
vi.mock("@/lib/player/service", () => ({ authenticate: vi.fn() }));

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

const ALICE = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", nickname: "Curious Otter", avatar: "🦦", tokenHash: "a", createdAt: new Date() };
const BOB = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", nickname: "Bold Fox", avatar: "🦊", tokenHash: "b", createdAt: new Date() };
const TOKENS: Record<string, PlayerRow> = { "alice-token": ALICE, "bob-token": BOB };

/** An in-memory stand-in for the plays table with the same uniqueness and concurrency contract. */
function usePlayStore() {
  const rows = new Map<string, PlayRow>();
  let next = 0;
  vi.mocked(startPlayerPlay).mockImplementation(async (caseId, playerId) => {
    const existing = [...rows.values()].find((r) => r.caseId === caseId && r.playerId === playerId);
    if (existing) return { play: existing, created: false };
    const id = `22222222-2222-4222-8222-22222222222${next++}`;
    const row: PlayRow = { id, caseId, playerId, actions: [], status: "in_progress", score: 1000, livesLeft: 3, startedAt: new Date(), finishedAt: null };
    rows.set(id, row);
    return { play: row, created: true };
  });
  vi.mocked(findPlay).mockImplementation(async (id) => rows.get(id) ?? null);
  vi.mocked(appendAction).mockImplementation(async (id, expected, action, state) => {
    const row = rows.get(id);
    if (!row || row.actions.length !== expected) return null;
    const updated = { ...row, actions: [...row.actions, action], status: state.status, livesLeft: state.livesLeft };
    rows.set(id, updated);
    return updated;
  });
}

function request(token: string | null, body?: unknown) {
  return new Request("http://test/api", {
    method: body === undefined ? "GET" : "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function start(token = "alice-token") {
  const response = await postPlay(request(token, { caseSlug: "broad-street" }));
  return { status: response.status, body: (await response.json()) as { playId: string; view: PlayView } };
}

async function act(playId: string, body: unknown, token = "alice-token") {
  const response = await postAction(request(token, body), ctx(playId));
  return { status: response.status, body: (await response.json()) as { view: PlayView; error?: string; promotion?: unknown } };
}

describe("play routes", () => {
  beforeEach(() => {
    vi.mocked(findCaseBySlug).mockImplementation(async (slug) => (slug === record.slug ? record : null));
    vi.mocked(findCaseById).mockImplementation(async (id) => (id === record.id ? record : null));
    vi.mocked(authenticate).mockImplementation(async (req) => {
      const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
      return TOKENS[token] ?? null;
    });
    usePlayStore();
  });

  it("requires a player token", async () => {
    expect((await postPlay(request(null, { caseSlug: "broad-street" }))).status).toBe(401);
    expect((await getPlay(request(null), ctx("22222222-2222-4222-8222-222222222220"))).status).toBe(401);
    expect((await postAction(request(null, { type: "open", clueId: "c3" }), ctx("22222222-2222-4222-8222-222222222220"))).status).toBe(401);
  });

  it("starts a play with the public view only, and resumes it when started again", async () => {
    const first = await start();
    expect(first.status).toBe(201);
    expect(first.body.view).toMatchObject({ status: "in_progress", score: 1000, livesLeft: 3, result: null });
    expect(JSON.stringify(first.body)).not.toMatch(/"(correct|supports|refutes)"/);

    await act(first.body.playId, { type: "open", clueId: "c4" });
    const again = await start();
    expect(again.status).toBe(200);
    expect(again.body.playId).toBe(first.body.playId);
    expect(again.body.view.score).toBe(900);
  });

  it("answers 404 for an unknown case and 400 for a malformed body", async () => {
    expect((await postPlay(request("alice-token", { caseSlug: "nope" }))).status).toBe(404);
    expect((await postPlay(request("alice-token", {}))).status).toBe(400);
  });

  it("plays to a solve and returns the spoiler-free share grid with the result", async () => {
    const { body } = await start();

    expect((await act(body.playId, { type: "open", clueId: "c6" })).body.view.score).toBe(900);
    const wrong = await act(body.playId, { type: "accuse", hypothesisId: "h4" });
    expect(wrong.body.view.hypotheses.find((h) => h.id === "h4")).toMatchObject({ status: "ruled_out", refutedByClueId: "c7" });
    expect(JSON.stringify(wrong.body)).not.toMatch(/"(correct|supports|refutes|correctHypothesisId|grid)"/);
    expect(wrong.body.view.narration.closing).toBeNull();
    expect(wrong.body).not.toHaveProperty("promotion");

    const solved = await act(body.playId, { type: "accuse", hypothesisId: "h1" });
    expect(solved.body.view).toMatchObject({ status: "solved", score: 700 });
    expect(solved.body.view.result?.grid).toBe("⬛⬛⬛🔎⬛⬛ ❌✅");
    expect(solved.body.promotion).toMatchObject({ name: "Investigator", level: 2 });
    expect(await act(body.playId, { type: "open", clueId: "c3" })).toMatchObject({ status: 409, body: { error: "game_over" } });
  });

  it("hides a play from every player but its owner", async () => {
    const { body } = await start("alice-token");

    expect((await getPlay(request("bob-token"), ctx(body.playId))).status).toBe(404);
    expect(await act(body.playId, { type: "open", clueId: "c3" }, "bob-token")).toMatchObject({ status: 404, body: { error: "play_not_found" } });
    expect((await getPlay(request("alice-token"), ctx(body.playId))).status).toBe(200);
  });

  it("rejects invalid moves with a clear error", async () => {
    const { body } = await start();

    expect(await act(body.playId, { type: "open", clueId: "c1" })).toMatchObject({ status: 409, body: { error: "clue_visible" } });
    expect(await act(body.playId, { type: "accuse", hypothesisId: "h9" })).toMatchObject({ status: 400, body: { error: "unknown_hypothesis" } });
    expect(await act(body.playId, { type: "peek", clueId: "c3" })).toMatchObject({ status: 400, body: { error: "invalid_request" } });
    expect(await act("not-a-uuid", { type: "open", clueId: "c3" })).toMatchObject({ status: 404 });
  });

  it("reports a conflict when another move landed between read and write", async () => {
    const { body } = await start();
    vi.mocked(appendAction).mockResolvedValueOnce(null);

    expect(await act(body.playId, { type: "open", clueId: "c3" })).toMatchObject({ status: 409, body: { error: "conflict" } });
  });
});
