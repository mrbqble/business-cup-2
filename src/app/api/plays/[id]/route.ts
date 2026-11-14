import { connection } from "next/server";
import { z } from "zod";

import { json, jsonError, unauthorized } from "@/lib/http";
import { getPlay } from "@/lib/play/service";
import { authenticate } from "@/lib/player/service";

/** Resumes a play after a reload: the current state, rebuilt from its recorded actions. Owner only. */
export async function GET(request: Request, { params }: RouteContext<"/api/plays/[id]">): Promise<Response> {
  await connection();
  const player = await authenticate(request);
  if (!player) return unauthorized();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return jsonError(404, "play_not_found", "We couldn't find that play.");

  const result = await getPlay(id, player.id);
  if (!result.ok) return jsonError(404, result.error, "We couldn't find that play.");
  return json({ playId: result.playId, view: result.view });
}
