import { z } from "zod";

import { json, jsonError, readJson, unauthorized } from "@/lib/http";
import { startPlay } from "@/lib/play/service";
import { authenticate } from "@/lib/player/service";

const body = z.object({ caseSlug: z.string().min(1).max(200) });

/** Starts the player's play of a case (201), or returns the one they already have (200). */
export async function POST(request: Request): Promise<Response> {
  const player = await authenticate(request);
  if (!player) return unauthorized();

  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "invalid_request", "Send { caseSlug }.");

  const result = await startPlay(parsed.data.caseSlug, player);
  if (!result.ok) {
    if (result.error === "plus_required") {
      return jsonError(403, "plus_required", "Past and archive cases come with Plus. Today's case is always free.");
    }
    if (result.error === "not_yet_available") {
      return jsonError(403, "not_yet_available", "This daily case isn't open yet. It unlocks at midnight New York time on its date.");
    }
    return jsonError(404, "case_not_found", "We couldn't find that case.");
  }
  return json({ playId: result.playId, view: result.view }, result.created ? 201 : 200);
}
