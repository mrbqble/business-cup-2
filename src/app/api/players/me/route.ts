import { connection } from "next/server";

import { countTopicCasesCreatedBy, findDailyCase } from "@/lib/db/cases";
import { findPlayerPlay, finishedDailyDays } from "@/lib/db/plays";
import { currentStreak } from "@/lib/game/streak";
import { json, unauthorized } from "@/lib/http";
import { FREE_TOPIC_CASES } from "@/lib/player/entitlements";
import { authenticate, publicPlayer } from "@/lib/player/service";
import { todayDateKey } from "@/lib/time";

/** The player's profile, streak, free topic case use and today's result. */
export async function GET(request: Request): Promise<Response> {
  await connection();
  const player = await authenticate(request);
  if (!player) return unauthorized();

  const today = todayDateKey();
  const [todayCase, days, topicCasesCreated] = await Promise.all([
    findDailyCase(today),
    finishedDailyDays(player.id),
    countTopicCasesCreatedBy(player.id),
  ]);
  const todayPlay = todayCase ? await findPlayerPlay(todayCase.id, player.id) : null;

  return json({
    player: publicPlayer(player),
    streak: currentStreak(days, today),
    topicCases: { created: topicCasesCreated, free: FREE_TOPIC_CASES },
    today: todayCase
      ? { slug: todayCase.slug, status: todayPlay?.status ?? "not_started", score: todayPlay?.score ?? null }
      : null,
  });
}
