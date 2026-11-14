import { connection } from "next/server";

import { summarize } from "@/lib/case/view";
import { findDailyCase, listArchiveCases } from "@/lib/db/cases";
import { playStatuses } from "@/lib/db/plays";
import { json } from "@/lib/http";
import { activePlan, caseAccess } from "@/lib/player/entitlements";
import { authenticate } from "@/lib/player/service";
import { todayDateKey } from "@/lib/time";

/** Past daily cases and archive cases, with a lock for each case this player can't open yet. */
export async function GET(request: Request): Promise<Response> {
  await connection();
  const player = await authenticate(request);
  const today = todayDateKey();
  const todays = await findDailyCase(today);
  const records = await listArchiveCases(todays?.dateKey ?? today);
  const statuses = player ? await playStatuses(player.id, records.map((r) => r.id)) : new Map();
  const plan = player ? activePlan(player) : "free";

  return json({
    plan,
    cases: records.map((record) => {
      const status = statuses.get(record.id) ?? null;
      const access = caseAccess({
        kind: record.kind,
        dateKey: record.dateKey,
        today,
        todaysCaseDateKey: todays?.dateKey ?? null,
        plan,
        hasPlay: status !== null,
        viaChallenge: false,
      });
      return { ...summarize(record), locked: !access.allowed, status };
    }),
  });
}
