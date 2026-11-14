import { json } from "@/lib/http";
import { createAnonymousPlayer } from "@/lib/player/service";
import { clientIp, createRateLimiter, tooManyRequests } from "@/lib/rate-limit";

const limiter = createRateLimiter({ limit: 20, windowMs: 60 * 60 * 1000 });

/** Creates an anonymous player and returns its secret token once. No sign-up, no personal data. */
export async function POST(request: Request): Promise<Response> {
  const decision = limiter.check(clientIp(request.headers));
  if (!decision.allowed) return tooManyRequests(decision);

  const { player, token } = await createAnonymousPlayer();
  return json({ player, token }, 201);
}
