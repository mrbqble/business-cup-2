import "server-only";

import { z } from "zod";

import { buildPlayView, type PlayView } from "@/lib/case/view";
import { findCaseById, findCaseBySlug } from "@/lib/db/cases";
import { appendAction, createPlay, findPlay } from "@/lib/db/plays";
import { applyAction, replay, rulesFor, type ActionError, type GameAction } from "@/lib/game/engine";

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open"), clueId: z.string().min(1) }),
  z.object({ type: z.literal("accuse"), hypothesisId: z.string().min(1) }),
]);

export type PlayResult = { ok: true; playId: string; view: PlayView } | { ok: false; error: PlayError };
export type PlayError = "case_not_found" | "play_not_found" | "conflict" | ActionError;

export async function startPlay(caseSlug: string): Promise<PlayResult> {
  const record = await findCaseBySlug(caseSlug);
  if (!record) return { ok: false, error: "case_not_found" };
  const play = await createPlay(record.id);
  const state = replay(rulesFor(record.content), []);
  if (!state.ok) throw new Error("A new play must start from a valid state");
  return { ok: true, playId: play.id, view: buildPlayView(record, state.state) };
}

export async function getPlay(playId: string): Promise<PlayResult> {
  const loaded = await load(playId);
  if (!loaded.ok) return loaded;
  return { ok: true, playId, view: buildPlayView(loaded.record, loaded.state) };
}

/** Validates the action against the recorded history, then records it; the score is always server-computed. */
export async function performAction(playId: string, action: GameAction): Promise<PlayResult> {
  const loaded = await load(playId);
  if (!loaded.ok) return loaded;

  const next = applyAction(rulesFor(loaded.record.content), loaded.state, action);
  if (!next.ok) return next;

  const saved = await appendAction(playId, loaded.actionCount, action, next.state);
  if (!saved) return { ok: false, error: "conflict" };
  return { ok: true, playId, view: buildPlayView(loaded.record, next.state) };
}

async function load(playId: string) {
  const play = await findPlay(playId);
  if (!play) return { ok: false as const, error: "play_not_found" as const };
  const record = await findCaseById(play.caseId);
  if (!record) return { ok: false as const, error: "case_not_found" as const };
  const replayed = replay(rulesFor(record.content), play.actions);
  if (!replayed.ok) throw new Error(`Recorded actions of play ${playId} no longer replay: ${replayed.error}`);
  return { ok: true as const, record, state: replayed.state, actionCount: play.actions.length };
}
