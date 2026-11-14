import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { initialState, scoreOf, type GameAction, type GameState } from "@/lib/game/engine";

import { getDb } from "./client";
import { plays, type PlayRow } from "./schema";

export async function createPlay(caseId: string): Promise<PlayRow> {
  const state = initialState();
  const [row] = await getDb()
    .insert(plays)
    .values({ caseId, actions: [], status: state.status, score: scoreOf(state), livesLeft: state.livesLeft })
    .returning();
  return row;
}

export async function findPlay(id: string): Promise<PlayRow | null> {
  const [row] = await getDb().select().from(plays).where(eq(plays.id, id)).limit(1);
  return row ?? null;
}

/**
 * Appends an action only if no other action landed since the caller read the play
 * (optimistic concurrency on the action count). Returns null on a conflict.
 */
export async function appendAction(
  id: string,
  expectedActionCount: number,
  action: GameAction,
  state: GameState,
): Promise<PlayRow | null> {
  const [row] = await getDb()
    .update(plays)
    .set({
      actions: sql`${plays.actions} || ${JSON.stringify([action])}::jsonb`,
      status: state.status,
      score: scoreOf(state),
      livesLeft: state.livesLeft,
      finishedAt: state.status === "in_progress" ? null : new Date(),
    })
    .where(and(eq(plays.id, id), sql`jsonb_array_length(${plays.actions}) = ${expectedActionCount}`))
    .returning();
  return row ?? null;
}
