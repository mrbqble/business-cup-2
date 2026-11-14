import { connection } from "next/server";

import { finishedDailyDays, playerSummary } from "@/lib/db/plays";
import { playerStats } from "@/lib/game/stats";
import { json, jsonError, unauthorized } from "@/lib/http";
import { activePlan, isPaid } from "@/lib/player/entitlements";
import { authenticate } from "@/lib/player/service";
import { todayDateKey } from "@/lib/time";

/** Personal stats, a Plus feature: cases finished, solve rate, average score, streaks and rank. */
export async function GET(request: Request): Promise<Response> {
  await connection();
  const player = await authenticate(request);
  if (!player) return unauthorized();
  if (!isPaid(activePlan(player))) return jsonError(403, "plus_required", "Personal stats come with Plus.");

  const [summary, days] = await Promise.all([playerSummary(player.id), finishedDailyDays(player.id)]);
  return json({ stats: playerStats(summary, days, todayDateKey()) });
}
