import "server-only";

import { findPlayerByTokenHash, insertPlayer } from "@/lib/db/players";
import type { PlayerRow } from "@/lib/db/schema";

import { randomIdentity } from "./names";
import { bearerToken, hashToken, newPlayerToken } from "./token";

export interface PublicPlayer {
  id: string;
  nickname: string;
  avatar: string;
}

export function publicPlayer(row: PlayerRow): PublicPlayer {
  return { id: row.id, nickname: row.nickname, avatar: row.avatar };
}

/** Creates an anonymous player; the token is returned once and only its hash is kept. */
export async function createAnonymousPlayer(): Promise<{ player: PublicPlayer; token: string }> {
  const token = newPlayerToken();
  const row = await insertPlayer({ ...randomIdentity(), tokenHash: hashToken(token) });
  return { player: publicPlayer(row), token };
}

/** The player whose token the request carries, or null. */
export async function authenticate(request: Request): Promise<PlayerRow | null> {
  const token = bearerToken(request.headers);
  return token ? findPlayerByTokenHash(hashToken(token)) : null;
}
