import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "./client";

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  avatar: string;
  score: number;
  solved: boolean;
  durationMs: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  /** The asking player's entry, even when outside the top entries. */
  you: LeaderboardEntry | null;
  total: number;
}

interface RankedRow extends Record<string, unknown> {
  rank: string | number;
  player_id: string;
  nickname: string;
  avatar: string;
  score: number;
  status: string;
  duration_ms: string | number;
  total: string | number;
}

/** Finished plays of a case: higher score first, then the shorter solve, then the earlier finish. */
export async function caseLeaderboard(caseId: string, playerId: string | null, limit = 50): Promise<Leaderboard> {
  const result = await getDb().execute<RankedRow>(sql`
    with ranked as (
      select p.player_id, pl.nickname, pl.avatar, p.score, p.status,
             round(extract(epoch from (p.finished_at - p.started_at)) * 1000) as duration_ms,
             row_number() over (order by p.score desc, p.finished_at - p.started_at asc, p.finished_at asc) as rank,
             count(*) over () as total
      from plays p
      join players pl on pl.id = p.player_id
      where p.case_id = ${caseId} and p.status <> 'in_progress'
    )
    select * from ranked
    where rank <= ${limit} or player_id = ${playerId}
    order by rank`);

  const rows = result.rows.map((row) => ({
    rank: Number(row.rank),
    playerId: row.player_id,
    nickname: row.nickname,
    avatar: row.avatar,
    score: row.score,
    solved: row.status === "solved",
    durationMs: Number(row.duration_ms),
  }));
  return {
    entries: rows.filter((row) => row.rank <= limit),
    you: rows.find((row) => row.playerId === playerId) ?? null,
    total: result.rows.length > 0 ? Number(result.rows[0].total) : 0,
  };
}
