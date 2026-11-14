import { connection } from "next/server";

import { countTopicCasesCreatedBy, findDailyCase } from "@/lib/db/cases";
import { findPlayerPlay, finishedDailyDays, playerRecord } from "@/lib/db/plays";
import { rankFor } from "@/lib/game/rank";
import { currentStreak } from "@/lib/game/streak";
import { json, unauthorized } from "@/lib/http";
import { planView } from "@/lib/player/billing";
import { activePlan, FREE_TOPIC_CASES, isPaid } from "@/lib/player/entitlements";
import { authenticate, publicPlayer } from "@/lib/player/service";
import { todayDateKey } from "@/lib/time";

/** The player's profile, plan, streak, detective rank, free topic case use and today's result. */
export async function GET(request: Request): Promise<Response> {
  await connection();
  const player = await authenticate(request);
  if (!player) return unauthorized();

  const today = todayDateKey();
  const [todayCase, days, topicCasesCreated, record] = await Promise.all([
    findDailyCase(today),
    finishedDailyDays(player.id),
    countTopicCasesCreatedBy(player.id),
    playerRecord(player.id),
  ]);
  const todayPlay = todayCase ? await findPlayerPlay(todayCase.id, player.id) : null;

  return json({
    player: publicPlayer(player),
    streak: currentStreak(days, today),
    rank: rankFor(record),
    plan: planView(player),
    topicCases: { created: topicCasesCreated, free: FREE_TOPIC_CASES, unlimited: isPaid(activePlan(player)) },
    today: todayCase
      ? { slug: todayCase.slug, status: todayPlay?.status ?? "not_started", score: todayPlay?.score ?? null }
      : null,
  });
}
