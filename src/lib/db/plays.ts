import "server-only";

import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { initialState, scoreOf, type GameAction, type GameState } from "@/lib/game/engine";
import type { PlayerRecord } from "@/lib/game/rank";
import { todayDateKey } from "@/lib/time";

import { getDb } from "./client";
import { cases, plays, type PlayRow } from "./schema";

/** The player's play of a case, created on first start; a second start returns the same play. */
export async function startPlayerPlay(caseId: string, playerId: string): Promise<{ play: PlayRow; created: boolean }> {
  const state = initialState();
  const [created] = await getDb()
    .insert(plays)
    .values({ caseId, playerId, actions: [], status: state.status, score: scoreOf(state), livesLeft: state.livesLeft })
    .onConflictDoNothing({ target: [plays.playerId, plays.caseId] })
    .returning();
  if (created) return { play: created, created: true };
  const existing = await findPlayerPlay(caseId, playerId);
  if (!existing) throw new Error("A conflicting play disappeared");
  return { play: existing, created: false };
}

export async function findPlayerPlay(caseId: string, playerId: string): Promise<PlayRow | null> {
  const [row] = await getDb()
    .select()
    .from(plays)
    .where(and(eq(plays.caseId, caseId), eq(plays.playerId, playerId)))
    .limit(1);
  return row ?? null;
}

export async function findPlay(id: string): Promise<PlayRow | null> {
  const [row] = await getDb().select().from(plays).where(eq(plays.id, id)).limit(1);
  return row ?? null;
}

/** New York dates on which the player finished that same day's daily case (the input to the streak). */
export async function finishedDailyDays(playerId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ dateKey: cases.dateKey, finishedAt: plays.finishedAt })
    .from(plays)
    .innerJoin(cases, eq(cases.id, plays.caseId))
    .where(and(eq(plays.playerId, playerId), eq(cases.kind, "daily"), ne(plays.status, "in_progress")));
  return rows.flatMap(({ dateKey, finishedAt }) =>
    dateKey && finishedAt && todayDateKey(finishedAt) === dateKey ? [dateKey] : [],
  );
}

/** Lifetime totals for the detective rank: finished plays and the sum of their final scores. */
export async function playerRecord(playerId: string): Promise<PlayerRecord> {
  const [row] = await getDb()
    .select({
      cases: sql<number>`(count(*) filter (where ${plays.status} <> 'in_progress'))::int`,
      points: sql<number>`(coalesce(sum(${plays.score}) filter (where ${plays.status} <> 'in_progress'), 0))::int`,
    })
    .from(plays)
    .where(eq(plays.playerId, playerId));
  return { cases: row?.cases ?? 0, points: row?.points ?? 0 };
}

/** Lifetime counts for personal stats. */
export async function playerSummary(playerId: string): Promise<{ finished: number; solved: number; points: number }> {
  const [row] = await getDb()
    .select({
      finished: sql<number>`(count(*) filter (where ${plays.status} <> 'in_progress'))::int`,
      solved: sql<number>`(count(*) filter (where ${plays.status} = 'solved'))::int`,
      points: sql<number>`(coalesce(sum(${plays.score}) filter (where ${plays.status} <> 'in_progress'), 0))::int`,
    })
    .from(plays)
    .where(eq(plays.playerId, playerId));
  return { finished: row?.finished ?? 0, solved: row?.solved ?? 0, points: row?.points ?? 0 };
}

/** The player's play status for each of the given cases that they have started. */
export async function playStatuses(playerId: string, caseIds: string[]): Promise<Map<string, PlayRow["status"]>> {
  if (caseIds.length === 0) return new Map();
  const rows = await getDb()
    .select({ caseId: plays.caseId, status: plays.status })
    .from(plays)
    .where(and(eq(plays.playerId, playerId), inArray(plays.caseId, caseIds)));
  return new Map(rows.map((r) => [r.caseId, r.status]));
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
