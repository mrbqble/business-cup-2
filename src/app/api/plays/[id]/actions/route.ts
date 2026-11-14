import { z } from "zod";

import { json, jsonError, readJson } from "@/lib/http";
import { gameActionSchema, performAction, type PlayError } from "@/lib/play/service";

const MESSAGES: Record<PlayError, [status: number, message: string]> = {
  case_not_found: [404, "We couldn't find that case."],
  play_not_found: [404, "We couldn't find that play."],
  conflict: [409, "Another move landed first. Reload the case and try again."],
  game_over: [409, "This case is already closed."],
  unknown_clue: [400, "That clue isn't part of this case."],
  clue_visible: [409, "That clue is already open."],
  unknown_hypothesis: [400, "That answer isn't part of this case."],
  already_ruled_out: [409, "That answer is already ruled out."],
};

export async function POST(request: Request, { params }: RouteContext<"/api/plays/[id]/actions">): Promise<Response> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return jsonError(404, "play_not_found", MESSAGES.play_not_found[1]);

  const action = gameActionSchema.safeParse(await readJson(request));
  if (!action.success) return jsonError(400, "invalid_request", 'Send { type: "open", clueId } or { type: "accuse", hypothesisId }.');

  const result = await performAction(id, action.data);
  if (!result.ok) {
    const [status, message] = MESSAGES[result.error];
    return jsonError(status, result.error, message);
  }
  return json({ playId: result.playId, view: result.view });
}
