import { connection } from "next/server";

import { getChallengeView, isChallengeSlug } from "@/lib/challenge/service";
import { json, jsonError } from "@/lib/http";
import { authenticate } from "@/lib/player/service";

/** A challenge as this viewer may see it: results only once the viewer has finished the case. */
export async function GET(request: Request, { params }: RouteContext<"/api/challenges/[slug]">): Promise<Response> {
  await connection();
  const { slug } = await params;
  if (!isChallengeSlug(slug)) return jsonError(404, "challenge_not_found", "We couldn't find that challenge.");
  const viewer = await authenticate(request);
  const view = await getChallengeView(slug, viewer);
  if (!view) return jsonError(404, "challenge_not_found", "We couldn't find that challenge.");
  return json({ challenge: view });
}
