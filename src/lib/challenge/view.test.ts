import { describe, expect, it } from "vitest";

import type { CaseSummary } from "@/lib/case/view";

import { buildChallengeView, CHALLENGE_LIST_LIMIT, type ChallengeParticipant, type ChallengeResult, type ChallengeViewInput } from "./view";

const summary: CaseSummary = {
  slug: "broad-street",
  number: 2,
  kind: "daily",
  dateKey: "2026-11-15",
  title: "How did John Snow find the source?",
  category: "history",
  era: "1854 London",
  cover: null,
};

const result = (score: number, durationMs: number): ChallengeResult => ({
  solved: score > 0,
  score,
  grid: "🔎⬛⬛⬛⬛⬛ ❌✅",
  durationMs,
  openedClues: 1,
  wrongAccusations: 1,
});

const at = (minute: number) => new Date(Date.UTC(2026, 10, 15, 12, minute));
const ANN: ChallengeParticipant = { playerId: "ann", nickname: "Calm Heron", avatar: "🦩", joinedAt: at(0), finishedAt: at(5), result: result(800, 300_000) };
const BEN: ChallengeParticipant = { playerId: "ben", nickname: "Bold Fox", avatar: "🦊", joinedAt: at(10), finishedAt: at(20), result: result(900, 400_000) };
const CAL: ChallengeParticipant = { playerId: "cal", nickname: "Swift Otter", avatar: "🦦", joinedAt: at(30), finishedAt: null, result: null };

const input = (overrides: Partial<ChallengeViewInput>): ChallengeViewInput => ({
  slug: "AbC123xy",
  caseSummary: summary,
  challengerId: "ann",
  viewerId: "cal",
  viewerJoined: true,
  viewerFinished: false,
  viewerResult: null,
  participants: [ANN, BEN, CAL],
  ...overrides,
});

describe("buildChallengeView", () => {
  it("shows a friend who hasn't finished who played, but no results, order or comparison", () => {
    const view = buildChallengeView(input({}));

    expect(view.resultsVisible).toBe(false);
    expect(view.comparison).toBeNull();
    expect(view.entries.map((e) => [e.nickname, e.finished, e.result, e.rank])).toEqual([
      ["Calm Heron", true, null, null],
      ["Bold Fox", true, null, null],
      ["Swift Otter", false, null, null],
    ]);
    expect(JSON.stringify(view)).not.toMatch(/"(score|grid|durationMs)"/);
    expect(view.challenger).toEqual({ nickname: "Calm Heron", avatar: "🦩" });
  });

  it("shows results ranked like the leaderboard and a side-by-side once the friend finishes", () => {
    const mine = result(700, 200_000);
    const view = buildChallengeView(
      input({ participants: [ANN, BEN, { ...CAL, finishedAt: at(40), result: mine }], viewerFinished: true, viewerResult: mine }),
    );

    expect(view.resultsVisible).toBe(true);
    expect(view.entries.map((e) => [e.rank, e.nickname, e.isYou, e.isChallenger])).toEqual([
      [1, "Bold Fox", false, false],
      [2, "Calm Heron", false, true],
      [3, "Swift Otter", true, false],
    ]);
    expect(view.comparison).toEqual({ you: mine, them: ANN.result });
  });

  it("shows the challenger every result but no comparison with themselves", () => {
    const view = buildChallengeView(input({ viewerId: "ann", viewerJoined: false, viewerFinished: true, viewerResult: ANN.result }));
    expect(view.you).toEqual({ isChallenger: true, joined: true, finished: true });
    expect(view.entries[0].result?.score).toBe(900);
    expect(view.comparison).toBeNull();
  });

  it("never exposes player ids or answer data, and lists at most 20 players", () => {
    const crowd = Array.from({ length: 30 }, (_, i): ChallengeParticipant => ({ ...CAL, playerId: `p${i}`, nickname: `Player ${i}`, joinedAt: at(i) }));
    const view = buildChallengeView(input({ viewerId: null, viewerJoined: false, participants: [ANN, ...crowd] }));

    expect(view.entries).toHaveLength(CHALLENGE_LIST_LIMIT);
    expect(view.total).toBe(31);
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/"(playerId|correct|correctHypothesisId|solution|refutes|supports)"/);
    expect(json).not.toContain('"ann"');
  });
});
