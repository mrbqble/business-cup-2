import "server-only";

import { z } from "zod";

import { buildPlayView, summarize, type CaseSummary, type PlayView } from "@/lib/case/view";
import { findCaseById, findCaseBySlug } from "@/lib/db/cases";
import { appendAction, findPlay, playerRecord, startPlayerPlay } from "@/lib/db/plays";
import { findPlayerById } from "@/lib/db/players";
import { applyAction, replay, rulesFor, scoreOf, type ActionError, type GameAction } from "@/lib/game/engine";
import { promotionFor, type Rank } from "@/lib/game/rank";
import { shareGrid } from "@/lib/game/share";

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open"), clueId: z.string().min(1) }),
  z.object({ type: z.literal("accuse"), hypothesisId: z.string().min(1) }),
]);

export type PlayResult =
  | { ok: true; playId: string; view: PlayView; created?: boolean; promotion?: Rank | null }
  | { ok: false; error: PlayError };
export type PlayError = "case_not_found" | "play_not_found" | "conflict" | ActionError;

/** Starts the player's play of a case, or resumes it when they already have one. */
export async function startPlay(caseSlug: string, playerId: string): Promise<PlayResult> {
  const record = await findCaseBySlug(caseSlug);
  if (!record) return { ok: false, error: "case_not_found" };
  const { play, created } = await startPlayerPlay(record.id, playerId);
  const replayed = replay(rulesFor(record.content), play.actions);
  if (!replayed.ok) throw new Error(`Recorded actions of play ${play.id} no longer replay: ${replayed.error}`);
  return { ok: true, playId: play.id, view: buildPlayView(record, replayed.state), created };
}

export async function getPlay(playId: string, playerId: string): Promise<PlayResult> {
  const loaded = await load(playId, playerId);
  if (!loaded.ok) return loaded;
  return { ok: true, playId, view: buildPlayView(loaded.record, loaded.state) };
}

/** Validates the action against the recorded history, then records it; the score is always server-computed. */
export async function performAction(playId: string, playerId: string, action: GameAction): Promise<PlayResult> {
  const loaded = await load(playId, playerId);
  if (!loaded.ok) return loaded;

  const next = applyAction(rulesFor(loaded.record.content), loaded.state, action);
  if (!next.ok) return next;

  const saved = await appendAction(playId, loaded.actionCount, action, next.state);
  if (!saved) return { ok: false, error: "conflict" };
  const view = buildPlayView(loaded.record, next.state);
  if (next.state.status === "in_progress") return { ok: true, playId, view };
  // The move that ends a case may earn a new detective rank.
  const promotion = promotionFor(await playerRecord(playerId), scoreOf(next.state));
  return { ok: true, playId, view, promotion };
}

export interface SharedResult {
  case: CaseSummary;
  player: { nickname: string; avatar: string };
  status: "solved" | "failed";
  score: number;
  grid: string;
}

/** What a share link may show: who played, the grid and the score. Never the answer. */
export async function getSharedResult(playId: string): Promise<SharedResult | null> {
  const play = await findPlay(playId);
  if (!play || play.status === "in_progress" || !play.playerId) return null;
  const [record, player] = await Promise.all([findCaseById(play.caseId), findPlayerById(play.playerId)]);
  if (!record || !player) return null;
  const rules = rulesFor(record.content);
  const replayed = replay(rules, play.actions);
  if (!replayed.ok || replayed.state.status === "in_progress") return null;
  return {
    case: summarize(record),
    player: { nickname: player.nickname, avatar: player.avatar },
    status: replayed.state.status,
    score: scoreOf(replayed.state),
    grid: shareGrid(rules, replayed.state),
  };
}

/** A play only its own player may read or change; anyone else gets "not found". */
async function load(playId: string, playerId: string) {
  const play = await findPlay(playId);
  if (!play || play.playerId !== playerId) return { ok: false as const, error: "play_not_found" as const };
  const record = await findCaseById(play.caseId);
  if (!record) return { ok: false as const, error: "case_not_found" as const };
  const replayed = replay(rulesFor(record.content), play.actions);
  if (!replayed.ok) throw new Error(`Recorded actions of play ${playId} no longer replay: ${replayed.error}`);
  return { ok: true as const, record, state: replayed.state, actionCount: play.actions.length };
}
