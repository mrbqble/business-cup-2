import { json, unauthorized } from "@/lib/http";
import { cancelPlan } from "@/lib/player/billing";
import { authenticate } from "@/lib/player/service";

/** One-click cancel: no renewal, access until the end of the paid period. */
export async function POST(request: Request): Promise<Response> {
  const player = await authenticate(request);
  if (!player) return unauthorized();
  return json({ plan: await cancelPlan(player) });
}
