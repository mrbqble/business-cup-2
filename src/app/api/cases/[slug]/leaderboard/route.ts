import { connection } from "next/server";

import { summarize } from "@/lib/case/view";
import { findCaseBySlug } from "@/lib/db/cases";
import { caseLeaderboard } from "@/lib/db/leaderboard";
import { json, jsonError } from "@/lib/http";
import { authenticate } from "@/lib/player/service";

/** Top 50 finished plays of a case plus the asking player's own rank. Scores are server-computed. */
export async function GET(request: Request, { params }: RouteContext<"/api/cases/[slug]/leaderboard">): Promise<Response> {
  await connection();
  const { slug } = await params;
  const record = await findCaseBySlug(slug);
  if (!record) return jsonError(404, "case_not_found", "We couldn't find that case.");

  const player = await authenticate(request);
  const board = await caseLeaderboard(record.id, player?.id ?? null);
  const strip = ({ playerId, ...entry }: (typeof board.entries)[number]) => ({ ...entry, isYou: playerId === player?.id });
  return json({
    case: summarize(record),
    entries: board.entries.map(strip),
    you: board.you ? strip(board.you) : null,
    total: board.total,
  });
}
