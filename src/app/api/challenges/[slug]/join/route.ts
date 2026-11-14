import { isChallengeSlug, joinChallengeFor } from "@/lib/challenge/service";
import { json, jsonError, unauthorized } from "@/lib/http";
import { authenticate } from "@/lib/player/service";

/** Takes the challenge as the visitor's own anonymous player; the paywall never applies here. */
export async function POST(request: Request, { params }: RouteContext<"/api/challenges/[slug]/join">): Promise<Response> {
  const player = await authenticate(request);
  if (!player) return unauthorized();
  const { slug } = await params;
  if (!isChallengeSlug(slug)) return jsonError(404, "challenge_not_found", "We couldn't find that challenge.");

  const result = await joinChallengeFor(slug, player);
  if (!result.ok) {
    return result.error === "not_yet_available"
      ? jsonError(403, "not_yet_available", "This case isn't open yet.")
      : jsonError(404, "challenge_not_found", "We couldn't find that challenge.");
  }
  return json({ caseSlug: result.caseSlug, playId: result.playId });
}
