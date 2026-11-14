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

  const result = await startPlay(parsed.data.caseSlug, player.id);
  if (!result.ok) return jsonError(404, "case_not_found", "We couldn't find that case.");
  return json({ playId: result.playId, view: result.view }, result.created ? 201 : 200);
}
