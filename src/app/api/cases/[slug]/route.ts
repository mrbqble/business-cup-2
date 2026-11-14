import { connection } from "next/server";

import { buildPlayView } from "@/lib/case/view";
import { findCaseBySlug } from "@/lib/db/cases";
import { initialState } from "@/lib/game/engine";
import { json, jsonError } from "@/lib/http";

/** A case's public view: opening clues, sealed clue kinds and hypotheses, never the answer. */
export async function GET(_request: Request, { params }: RouteContext<"/api/cases/[slug]">): Promise<Response> {
  await connection();
  const { slug } = await params;
  const record = await findCaseBySlug(slug);
  if (!record) return jsonError(404, "case_not_found", "We couldn't find that case.");
  return json({ view: buildPlayView(record, initialState()) });
}
