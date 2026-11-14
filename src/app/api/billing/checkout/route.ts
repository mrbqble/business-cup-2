import { z } from "zod";

import { json, jsonError, readJson, unauthorized } from "@/lib/http";
import { demoCheckout } from "@/lib/player/billing";
import { billingPeriods, plans } from "@/lib/player/entitlements";
import { authenticate } from "@/lib/player/service";

const body = z.object({ plan: z.enum(plans), period: z.enum(billingPeriods) });

/** Demo checkout: grants the plan for real, charges nothing, and never asks for payment details. */
export async function POST(request: Request): Promise<Response> {
  const player = await authenticate(request);
  if (!player) return unauthorized();
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(400, "invalid_request", 'Send { plan: "plus", period: "monthly" | "yearly" }.');

  const result = await demoCheckout(player, parsed.data.plan, parsed.data.period);
  if (!result.ok) return jsonError(400, "not_available", "Family plans open soon. Plus is available now.");
  return json({ plan: result.plan });
}
