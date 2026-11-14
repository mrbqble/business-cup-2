import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "./client";
import { players, type PlayerRow } from "./schema";

export async function insertPlayer(values: { nickname: string; avatar: string; tokenHash: string }): Promise<PlayerRow> {
  const [row] = await getDb().insert(players).values(values).returning();
  return row;
}

export async function findPlayerById(id: string): Promise<PlayerRow | null> {
  const [row] = await getDb().select().from(players).where(eq(players.id, id)).limit(1);
  return row ?? null;
}

export async function findPlayerByTokenHash(tokenHash: string): Promise<PlayerRow | null> {
  const [row] = await getDb().select().from(players).where(eq(players.tokenHash, tokenHash)).limit(1);
  return row ?? null;
}
