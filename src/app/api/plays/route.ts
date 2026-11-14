import { z } from "zod";

import { json, jsonError, readJson } from "@/lib/http";
import { startPlay } from "@/lib/play/service";

const body = z.object({ caseSlug: z.string().min(1).max(200) });

export async function POST(request: Request): Promise<Response> {
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "invalid_request", "Send { caseSlug }.");

  const result = await startPlay(parsed.data.caseSlug);
  if (!result.ok) return jsonError(404, "case_not_found", "We couldn't find that case.");
  return json({ playId: result.playId, view: result.view }, 201);
}
