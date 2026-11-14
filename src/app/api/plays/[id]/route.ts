import { connection } from "next/server";
import { z } from "zod";

import { json, jsonError } from "@/lib/http";
import { getPlay } from "@/lib/play/service";

/** Resumes a play after a reload: the current state, rebuilt from its recorded actions. */
export async function GET(_request: Request, { params }: RouteContext<"/api/plays/[id]">): Promise<Response> {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return jsonError(404, "play_not_found", "We couldn't find that play.");

  const result = await getPlay(id);
  if (!result.ok) return jsonError(404, result.error, "We couldn't find that play.");
  return json({ playId: result.playId, view: result.view });
}
