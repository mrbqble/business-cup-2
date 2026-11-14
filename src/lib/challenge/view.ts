import type { CaseSummary } from "@/lib/case/view";

export const CHALLENGE_LIST_LIMIT = 20;

export interface ChallengeResult {
  solved: boolean;
  score: number;
  /** Spoiler-free grid, e.g. "🔎🔎⬛⬛⬛⬛ ❌✅". */
  grid: string;
  durationMs: number;
  openedClues: number;
  wrongAccusations: number;
}

export interface ChallengeParticipant {
  playerId: string;
  nickname: string;
  avatar: string;
  joinedAt: Date;
  finishedAt: Date | null;
  /** Set once the participant finished the case. */
  result: ChallengeResult | null;
}

export interface ChallengeViewInput {
  slug: string;
  caseSummary: CaseSummary;
  challengerId: string;
  viewerId: string | null;
  viewerJoined: boolean;
  /** Whether the viewer has finished this case themselves (from the link or not). */
  viewerFinished: boolean;
  /** The viewer's own result, when they finished. */
  viewerResult: ChallengeResult | null;
  participants: ChallengeParticipant[];
}

export interface ChallengeEntryView {
  /** Leaderboard position among finished players; only once results are visible. */
  rank: number | null;
  nickname: string;
  avatar: string;
  isYou: boolean;
  isChallenger: boolean;
  finished: boolean;
  result: ChallengeResult | null;
}

export interface ChallengeView {
  slug: string;
  case: CaseSummary;
  challenger: { nickname: string; avatar: string };
  you: { isChallenger: boolean; joined: boolean; finished: boolean };
  /** Results appear only to players who finished the case, so the link never spoils it. */
  resultsVisible: boolean;
  entries: ChallengeEntryView[];
  total: number;
  /** Side by side once the friend finishes: the viewer against the challenger. */
  comparison: { you: ChallengeResult; them: ChallengeResult } | null;
}

/**
 * What a challenge page may show this viewer. Before the viewer finishes the case: who took the
 * challenge and whether they finished, nothing more (no scores, grids, times or order). Player ids
 * never leave the server, and no answer data is ever part of a challenge.
 */
export function buildChallengeView(input: ChallengeViewInput): ChallengeView {
  const challenger = input.participants.find((p) => p.playerId === input.challengerId);
  const isChallenger = input.viewerId !== null && input.viewerId === input.challengerId;
  const resultsVisible = isChallenger || input.viewerFinished;

  const finished = input.participants
    .filter((p) => p.result !== null)
    .sort(
      (a, b) =>
        b.result!.score - a.result!.score ||
        a.result!.durationMs - b.result!.durationMs ||
        (a.finishedAt?.getTime() ?? 0) - (b.finishedAt?.getTime() ?? 0),
    );
  const unfinished = input.participants.filter((p) => p.result === null);
  const ordered = resultsVisible ? [...finished, ...unfinished] : [...input.participants].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());

  const entries = ordered.slice(0, CHALLENGE_LIST_LIMIT).map(
    (p): ChallengeEntryView => ({
      rank: resultsVisible && p.result ? finished.indexOf(p) + 1 : null,
      nickname: p.nickname,
      avatar: p.avatar,
      isYou: p.playerId === input.viewerId,
      isChallenger: p.playerId === input.challengerId,
      finished: p.result !== null,
      result: resultsVisible ? p.result : null,
    }),
  );

  const comparison =
    !isChallenger && input.viewerFinished && input.viewerResult && challenger?.result
      ? { you: input.viewerResult, them: challenger.result }
      : null;

  return {
    slug: input.slug,
    case: input.caseSummary,
    challenger: { nickname: challenger?.nickname ?? "A detective", avatar: challenger?.avatar ?? "🕵️" },
    you: { isChallenger, joined: isChallenger || input.viewerJoined, finished: input.viewerFinished },
    resultsVisible,
    entries,
    total: input.participants.length,
    comparison,
  };
}
