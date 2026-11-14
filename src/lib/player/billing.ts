import "server-only";

import { updatePlayerPlan } from "@/lib/db/players";
import type { PlayerRow } from "@/lib/db/schema";

import { activePlan, isPaid, periodEnd, PURCHASABLE_PLANS, type BillingPeriod, type Plan } from "./entitlements";

/** The player's plan as the client sees it. */
export interface PlanView {
  /** The plan in force now. */
  plan: Plan;
  period: BillingPeriod | null;
  startedAt: string | null;
  /** End of the paid period: the renewal date, or the last day of access after a cancel. */
  expiresAt: string | null;
  canceled: boolean;
}

export function planView(player: PlayerRow, now: Date = new Date()): PlanView {
  const plan = activePlan(player, now);
  if (!isPaid(plan)) return { plan: "free", period: null, startedAt: null, expiresAt: null, canceled: false };
  return {
    plan,
    period: player.planPeriod,
    startedAt: player.planStartedAt?.toISOString() ?? null,
    expiresAt: player.planExpiresAt?.toISOString() ?? null,
    canceled: player.planCanceledAt !== null,
  };
}

/** Demo checkout: grants the plan for one period. Nothing is charged and no payment data exists. */
export async function demoCheckout(
  player: PlayerRow,
  plan: Plan,
  period: BillingPeriod,
  now: Date = new Date(),
): Promise<{ ok: true; plan: PlanView } | { ok: false; error: "not_available" }> {
  if (!PURCHASABLE_PLANS.includes(plan)) return { ok: false, error: "not_available" };
  const row = await updatePlayerPlan(player.id, {
    plan,
    planPeriod: period,
    planStartedAt: now,
    planExpiresAt: periodEnd(now, period),
    planCanceledAt: null,
  });
  return { ok: true, plan: planView(row ?? player, now) };
}

/** One-click cancel: no renewal; the paid period runs to its end. */
export async function cancelPlan(player: PlayerRow, now: Date = new Date()): Promise<PlanView> {
  if (!isPaid(activePlan(player, now)) || player.planCanceledAt) return planView(player, now);
  const row = await updatePlayerPlan(player.id, { planCanceledAt: now });
  return planView(row ?? player, now);
}
