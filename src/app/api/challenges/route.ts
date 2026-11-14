import { z } from "zod";

import { createChallengeFor } from "@/lib/challenge/service";
import { json, jsonError, readJson, unauthorized } from "@/lib/http";
import { authenticate } from "@/lib/player/service";

const body = z.object({ caseSlug: z.string().min(1).max(200) });

/** Creates (or returns) the player's challenge link for a case they have finished. */
export async function POST(request: Request): Promise<Response> {
  const player = await authenticate(request);
  if (!player) return unauthorized();
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "invalid_request", "Send { caseSlug }.");

  const result = await createChallengeFor(player, parsed.data.caseSlug);
  if (!result.ok) {
    return result.error === "finish_first"
      ? jsonError(409, "finish_first", "Finish the case first, then challenge a friend.")
      : jsonError(404, "case_not_found", "We couldn't find that case.");
  }
  return json({ slug: result.slug }, 201);
}
