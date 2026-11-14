import "server-only";

import { randomBytes } from "node:crypto";

import { summarize } from "@/lib/case/view";
import { findCaseById, findCaseBySlug } from "@/lib/db/cases";
import { challengeEntryRows, createChallenge, findChallengeBySlug, joinChallenge } from "@/lib/db/challenges";
import { findPlayerPlay } from "@/lib/db/plays";
import type { PlayerRow, PlayRow } from "@/lib/db/schema";
import { replay, rulesFor, scoreOf, type GameAction, type GameRules } from "@/lib/game/engine";
import { shareGrid } from "@/lib/game/share";
import { startPlay } from "@/lib/play/service";

import { buildChallengeView, type ChallengeResult, type ChallengeView } from "./view";

const SLUG_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** 8 random characters without look-alikes (0/O, 1/l/I). */
export function newChallengeSlug(): string {
  return [...randomBytes(8)].map((byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length]).join("");
}

export function isChallengeSlug(value: string): boolean {
  return /^[A-Za-z0-9]{6,16}$/.test(value);
}

export type CreateChallengeResult = { ok: true; slug: string } | { ok: false; error: "case_not_found" | "finish_first" };

/** A challenge link for a case the player has finished; asking again returns the same link. */
export async function createChallengeFor(player: PlayerRow, caseSlug: string): Promise<CreateChallengeResult> {
  const record = await findCaseBySlug(caseSlug);
  if (!record) return { ok: false, error: "case_not_found" };
  const play = await findPlayerPlay(record.id, player.id);
  if (!play || play.status === "in_progress") return { ok: false, error: "finish_first" };
  try {
    return { ok: true, slug: (await createChallenge(record.id, player.id, newChallengeSlug())).slug };
  } catch {
    // A slug collision is astronomically rare; one retry with a fresh slug settles it.
    return { ok: true, slug: (await createChallenge(record.id, player.id, newChallengeSlug())).slug };
  }
}

export async function getChallengeView(slug: string, viewer: PlayerRow | null): Promise<ChallengeView | null> {
  const challenge = await findChallengeBySlug(slug);
  if (!challenge) return null;
  const record = await findCaseById(challenge.caseId);
  if (!record) return null;
  const rules = rulesFor(record.content);
  const rows = await challengeEntryRows(challenge.id, record.id);

  const participants = rows.map((row) => ({
    playerId: row.playerId,
    nickname: row.nickname,
    avatar: row.avatar,
    joinedAt: row.joinedAt,
    finishedAt: row.finishedAt,
    result: row.status && row.status !== "in_progress" && row.actions ? resultOf(rules, row.actions, row.startedAt, row.finishedAt) : null,
  }));

  const viewerEntry = viewer ? rows.find((r) => r.playerId === viewer.id) : undefined;
  const viewerPlay: Pick<PlayRow, "status" | "actions" | "startedAt" | "finishedAt"> | null = viewer
    ? viewerEntry?.status
      ? { status: viewerEntry.status, actions: viewerEntry.actions ?? [], startedAt: viewerEntry.startedAt!, finishedAt: viewerEntry.finishedAt }
      : await findPlayerPlay(record.id, viewer.id)
    : null;
  const viewerFinished = Boolean(viewerPlay && viewerPlay.status !== "in_progress");

  return buildChallengeView({
    slug: challenge.slug,
    caseSummary: summarize(record),
    challengerId: challenge.challengerId,
    viewerId: viewer?.id ?? null,
    viewerJoined: Boolean(viewerEntry),
    viewerFinished,
    viewerResult: viewerPlay && viewerFinished ? resultOf(rules, viewerPlay.actions, viewerPlay.startedAt, viewerPlay.finishedAt) : null,
    participants,
  });
}

export type JoinChallengeResult = { ok: true; caseSlug: string; playId: string } | { ok: false; error: "challenge_not_found" | "not_yet_available" };

/** Takes the challenge: records the entry, then starts (or resumes) the player's own play of its case. */
export async function joinChallengeFor(slug: string, player: PlayerRow): Promise<JoinChallengeResult> {
  const challenge = await findChallengeBySlug(slug);
  if (!challenge) return { ok: false, error: "challenge_not_found" };
  const record = await findCaseById(challenge.caseId);
  if (!record) return { ok: false, error: "challenge_not_found" };
  await joinChallenge(challenge.id, player.id);
  const started = await startPlay(record.slug, player);
  if (!started.ok) return { ok: false, error: started.error === "not_yet_available" ? "not_yet_available" : "challenge_not_found" };
  return { ok: true, caseSlug: record.slug, playId: started.playId };
}

/** Public preview for the challenge link (Open Graph): the case and the challenger, never a result. */
export async function getChallengeCard(slug: string): Promise<{ title: string; label: string; challenger: string } | null> {
  const challenge = await findChallengeBySlug(slug);
  if (!challenge) return null;
  const record = await findCaseById(challenge.caseId);
  if (!record) return null;
  const rows = await challengeEntryRows(challenge.id, record.id, 5);
  const challenger = rows.find((r) => r.playerId === challenge.challengerId)?.nickname ?? "A detective";
  const label = record.kind === "daily" && record.number ? `Daily Case #${record.number}` : "Daily Case";
  return { title: record.content.title, label, challenger };
}

function resultOf(rules: GameRules, actions: GameAction[], startedAt: Date | null, finishedAt: Date | null): ChallengeResult | null {
  const replayed = replay(rules, actions);
  if (!replayed.ok || replayed.state.status === "in_progress") return null;
  const { state } = replayed;
  return {
    solved: state.status === "solved",
    score: scoreOf(state),
    grid: shareGrid(rules, state),
    durationMs: startedAt && finishedAt ? Math.max(0, finishedAt.getTime() - startedAt.getTime()) : 0,
    openedClues: state.openedClueIds.length,
    wrongAccusations: state.wrongAccusations.length,
  };
}
