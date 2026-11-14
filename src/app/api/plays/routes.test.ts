import { beforeEach, describe, expect, it, vi } from "vitest";

import { sampleCase, sampleSource } from "@/lib/case/__fixtures__/sample-case";
import type { CaseRecord } from "@/lib/case/schema";
import type { PlayView } from "@/lib/case/view";
import { findCaseById, findCaseBySlug } from "@/lib/db/cases";
import { appendAction, createPlay, findPlay } from "@/lib/db/plays";
import type { PlayRow } from "@/lib/db/schema";

import { GET as getPlay } from "./[id]/route";
import { POST as postAction } from "./[id]/actions/route";
import { POST as postPlay } from "./route";

vi.mock("next/server", () => ({ connection: () => Promise.resolve() }));
vi.mock("@/lib/db/cases", () => ({ findCaseBySlug: vi.fn(), findCaseById: vi.fn() }));
vi.mock("@/lib/db/plays", () => ({ createPlay: vi.fn(), findPlay: vi.fn(), appendAction: vi.fn() }));

const record: CaseRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "broad-street",
  number: 2,
  kind: "daily",
  dateKey: "2026-11-15",
  content: sampleCase(),
  sources: [{ id: "S1", title: sampleSource.title, url: sampleSource.url, revisionId: sampleSource.revisionId }],
};
const PLAY_ID = "22222222-2222-4222-8222-222222222222";

/** An in-memory stand-in for the plays table with the same optimistic-concurrency contract. */
function usePlayStore() {
  const rows = new Map<string, PlayRow>();
  vi.mocked(createPlay).mockImplementation(async (caseId) => {
    const row: PlayRow = { id: PLAY_ID, caseId, actions: [], status: "in_progress", score: 1000, livesLeft: 3, startedAt: new Date(), finishedAt: null };
    rows.set(row.id, row);
    return row;
  });
  vi.mocked(findPlay).mockImplementation(async (id) => rows.get(id) ?? null);
  vi.mocked(appendAction).mockImplementation(async (id, expected, action, state) => {
    const row = rows.get(id);
    if (!row || row.actions.length !== expected) return null;
    const updated = { ...row, actions: [...row.actions, action], status: state.status, livesLeft: state.livesLeft };
    rows.set(id, updated);
    return updated;
  });
  return rows;
}

const post = (body: unknown) => new Request("http://test/api", { method: "POST", body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

async function act(body: unknown, id = PLAY_ID) {
  const response = await postAction(post(body), ctx(id));
  return { status: response.status, body: (await response.json()) as { view: PlayView; error?: string } };
}

describe("play routes", () => {
  beforeEach(() => {
    vi.mocked(findCaseBySlug).mockImplementation(async (slug) => (slug === record.slug ? record : null));
    vi.mocked(findCaseById).mockImplementation(async (id) => (id === record.id ? record : null));
  });

  it("starts a play with the public view only", async () => {
    usePlayStore();
    const response = await postPlay(post({ caseSlug: "broad-street" }));
    const body = (await response.json()) as { playId: string; view: PlayView };

    expect(response.status).toBe(201);
    expect(body.playId).toBe(PLAY_ID);
    expect(body.view).toMatchObject({ status: "in_progress", score: 1000, livesLeft: 3, result: null });
    expect(JSON.stringify(body)).not.toMatch(/"(correct|supports|refutes)"/);
  });

  it("answers 404 for an unknown case and 400 for a malformed body", async () => {
    expect((await postPlay(post({ caseSlug: "nope" }))).status).toBe(404);
    expect((await postPlay(post({}))).status).toBe(400);
  });

  it("plays to a solve: open costs 100, a wrong accusation costs 200 and shows why, the right one ends the case", async () => {
    usePlayStore();
    await postPlay(post({ caseSlug: "broad-street" }));

    const opened = await act({ type: "open", clueId: "c6" });
    expect(opened.body.view.score).toBe(900);
    expect(opened.body.view.clues.find((c) => c.id === "c6")?.sealed).toBe(false);

    const wrong = await act({ type: "accuse", hypothesisId: "h4" });
    expect(wrong.body.view).toMatchObject({ score: 700, livesLeft: 2, status: "in_progress", result: null });
    expect(wrong.body.view.hypotheses.find((h) => h.id === "h4")).toMatchObject({ status: "ruled_out", refutedByClueId: "c7" });
    expect(JSON.stringify(wrong.body)).not.toMatch(/"(correct|supports|refutes|correctHypothesisId)"/);

    const solved = await act({ type: "accuse", hypothesisId: "h1" });
    expect(solved.body.view).toMatchObject({ status: "solved", score: 700 });
    expect(solved.body.view.result?.correctHypothesisId).toBe("h1");

    const after = await act({ type: "open", clueId: "c3" });
    expect(after).toMatchObject({ status: 409, body: { error: "game_over" } });
  });

  it("resumes a play from its recorded actions", async () => {
    usePlayStore();
    await postPlay(post({ caseSlug: "broad-street" }));
    await act({ type: "open", clueId: "c4" });

    const response = await getPlay(new Request("http://test"), ctx(PLAY_ID));
    const body = (await response.json()) as { view: PlayView };

    expect(response.status).toBe(200);
    expect(body.view.score).toBe(900);
    expect(body.view.clues.find((c) => c.id === "c4")?.sealed).toBe(false);
  });

  it("rejects invalid moves with a clear error", async () => {
    usePlayStore();
    await postPlay(post({ caseSlug: "broad-street" }));

    expect(await act({ type: "open", clueId: "c1" })).toMatchObject({ status: 409, body: { error: "clue_visible" } });
    expect(await act({ type: "accuse", hypothesisId: "h9" })).toMatchObject({ status: 400, body: { error: "unknown_hypothesis" } });
    expect(await act({ type: "peek", clueId: "c3" })).toMatchObject({ status: 400, body: { error: "invalid_request" } });
    expect(await act({ type: "open", clueId: "c3" }, "not-a-uuid")).toMatchObject({ status: 404 });
    expect(await act({ type: "open", clueId: "c3" }, "33333333-3333-4333-8333-333333333333")).toMatchObject({ status: 404 });
  });

  it("reports a conflict when another move landed between read and write", async () => {
    usePlayStore();
    await postPlay(post({ caseSlug: "broad-street" }));
    vi.mocked(appendAction).mockResolvedValueOnce(null);

    expect(await act({ type: "open", clueId: "c3" })).toMatchObject({ status: 409, body: { error: "conflict" } });
  });
});
