import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { GameAction } from "@/lib/game/engine";

import { getDb } from "./client";
import { challengeEntries, challenges, players, plays, type ChallengeRow, type PlayRow } from "./schema";

/** The challenger's link for a case, created once; the challenger is its first entry. */
export async function createChallenge(caseId: string, challengerId: string, slug: string): Promise<ChallengeRow> {
  const db = getDb();
  const [created] = await db
    .insert(challenges)
    .values({ caseId, challengerId, slug })
    .onConflictDoNothing({ target: [challenges.challengerId, challenges.caseId] })
    .returning();
  const row =
    created ??
    (await db.select().from(challenges).where(and(eq(challenges.challengerId, challengerId), eq(challenges.caseId, caseId))).limit(1))[0];
  await db.insert(challengeEntries).values({ challengeId: row.id, playerId: challengerId }).onConflictDoNothing();
  return row;
}

export async function findChallengeBySlug(slug: string): Promise<ChallengeRow | null> {
  const [row] = await getDb().select().from(challenges).where(eq(challenges.slug, slug)).limit(1);
  return row ?? null;
}

export async function joinChallenge(challengeId: string, playerId: string): Promise<void> {
  await getDb().insert(challengeEntries).values({ challengeId, playerId }).onConflictDoNothing();
}

/** Whether the player took any challenge for this case (so the paywall never blocks it). */
export async function hasChallengeEntryForCase(playerId: string, caseId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ challengeId: challengeEntries.challengeId })
    .from(challengeEntries)
    .innerJoin(challenges, eq(challenges.id, challengeEntries.challengeId))
    .where(and(eq(challengeEntries.playerId, playerId), eq(challenges.caseId, caseId)))
    .limit(1);
  return Boolean(row);
}

export interface ChallengeEntryRow {
  playerId: string;
  nickname: string;
  avatar: string;
  joinedAt: Date;
  status: PlayRow["status"] | null;
  score: number | null;
  actions: GameAction[] | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

/** Everyone who took the challenge, with their play of its case if they started one. */
export async function challengeEntryRows(challengeId: string, caseId: string, limit = 100): Promise<ChallengeEntryRow[]> {
  return getDb()
    .select({
      playerId: players.id,
      nickname: players.nickname,
      avatar: players.avatar,
      joinedAt: challengeEntries.joinedAt,
      status: plays.status,
      score: plays.score,
      actions: plays.actions,
      startedAt: plays.startedAt,
      finishedAt: plays.finishedAt,
    })
    .from(challengeEntries)
    .innerJoin(players, eq(players.id, challengeEntries.playerId))
    .leftJoin(plays, and(eq(plays.playerId, challengeEntries.playerId), eq(plays.caseId, caseId)))
    .where(eq(challengeEntries.challengeId, challengeId))
    .orderBy(asc(challengeEntries.joinedAt))
    .limit(limit);
}
