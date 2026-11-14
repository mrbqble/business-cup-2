import { connection } from "next/server";

import { buildPlayView } from "@/lib/case/view";
import { findDailyCase } from "@/lib/db/cases";
import { initialState } from "@/lib/game/engine";
import { json, jsonError } from "@/lib/http";
import { todayDateKey } from "@/lib/time";

/** Today's daily case in New York, falling back to the latest earlier one. Public view only. */
export async function GET(): Promise<Response> {
  await connection();
  const record = await findDailyCase(todayDateKey());
  if (!record) return jsonError(404, "no_case", "There is no case yet. Please check back soon.");
  return json({ view: buildPlayView(record, initialState()) });
}
