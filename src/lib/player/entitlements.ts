import type { CaseKind } from "@/lib/case/schema";

/** New topic cases a free player gets; opening a topic someone already generated is always free. */
export const FREE_TOPIC_CASES = 1;

export const plans = ["free", "plus", "family"] as const;
export const billingPeriods = ["monthly", "yearly"] as const;
export type Plan = (typeof plans)[number];
export type BillingPeriod = (typeof billingPeriods)[number];

/** USD list prices (CLAUDE.md 3.7). Checkout is a demo: nothing is charged. */
export const PRICES: Record<Exclude<Plan, "free">, Record<BillingPeriod, number>> = {
  plus: { monthly: 6.99, yearly: 49.99 },
  family: { monthly: 9.99, yearly: 79.99 },
};

/** Plans the demo checkout can grant. Family is shown on the pricing page but not sold yet. */
export const PURCHASABLE_PLANS: readonly Plan[] = ["plus"];

export interface PlanState {
  plan: Plan;
  planPeriod: BillingPeriod | null;
  planStartedAt: Date | null;
  planExpiresAt: Date | null;
  planCanceledAt: Date | null;
}

/** The plan in force: a paid plan counts until its period ends, canceled or not. */
export function activePlan(state: PlanState, now: Date = new Date()): Plan {
  if (state.plan === "free" || !state.planExpiresAt) return "free";
  return state.planExpiresAt > now ? state.plan : "free";
}

export function isPaid(plan: Plan): boolean {
  return plan !== "free";
}

/** End of a billing period that starts at `start`. */
export function periodEnd(start: Date, period: BillingPeriod): Date {
  const end = new Date(start);
  if (period === "monthly") end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end;
}

export function canCreateTopicCase(plan: Plan, topicCasesCreated: number): boolean {
  return isPaid(plan) || topicCasesCreated < FREE_TOPIC_CASES;
}

export type CaseAccess = { allowed: true } | { allowed: false; reason: "plus_required" | "not_yet_available" };

export interface CaseAccessInput {
  kind: CaseKind;
  dateKey: string | null;
  /** Today's New York date, YYYY-MM-DD. */
  today: string;
  /** Date of the daily case served as today's (the latest one on or before today). */
  todaysCaseDateKey: string | null;
  plan: Plan;
  /** The player already has a play of this case (resume or review). */
  hasPlay: boolean;
  /** The player took this case from a challenge link. */
  viaChallenge: boolean;
}

/**
 * Who may start a case. Today's case, cached topic cases and challenges are free; past daily cases
 * and archive cases come with Plus; future daily cases open on their date. A started play can
 * always be resumed or reviewed.
 */
export function caseAccess(input: CaseAccessInput): CaseAccess {
  if (input.hasPlay) return { allowed: true };
  if (input.kind === "daily" && input.dateKey !== null && input.dateKey > input.today) {
    return { allowed: false, reason: "not_yet_available" };
  }
  if (input.viaChallenge || input.kind === "topic") return { allowed: true };
  if (input.kind === "daily" && input.dateKey !== null && input.dateKey === input.todaysCaseDateKey) return { allowed: true };
  return isPaid(input.plan) ? { allowed: true } : { allowed: false, reason: "plus_required" };
}
