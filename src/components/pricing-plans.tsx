"use client";

import Link from "next/link";
import { useState } from "react";

import { formatUsd } from "@/lib/client/format";
import { useMe } from "@/lib/client/me";
import { PRICES, type BillingPeriod } from "@/lib/player/entitlements";

import { Card } from "./ui";

const FREE_FEATURES = ["Today's case, every day", "Streak, rank and leaderboards", "Challenge links for friends", "1 new case on any topic"];
const PLUS_FEATURES = ["Everything in Free", "Unlimited new cases on any topic", "The full case archive", "Personal stats and rank progress"];
const FAMILY_FEATURES = ["Plus for up to 6 people", "A private family league with a weekly board"];

/** Plan cards with a monthly/yearly switch (yearly selected). Family is shown but not on sale yet. */
export function PricingPlans() {
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const me = useMe();
  const current = me.status === "ready" ? me.me.plan.plan : null;

  const price = (plan: "plus" | "family") =>
    period === "yearly" ? `${formatUsd(PRICES[plan].yearly)}/year` : `${formatUsd(PRICES[plan].monthly)}/month`;
  const note = (plan: "plus" | "family") =>
    period === "yearly"
      ? `About ${formatUsd(PRICES[plan].yearly / 12)} a month, ${Math.round((1 - PRICES[plan].yearly / (PRICES[plan].monthly * 12)) * 100)}% less than monthly`
      : "Billed monthly";

  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Billing period" className="paper inline-flex self-start rounded-full p-1">
        {(["yearly", "monthly"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={period === option}
            onClick={() => setPeriod(option)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${period === option ? "bg-accent text-accent-text" : ""}`}
          >
            {option === "yearly" ? "Yearly" : "Monthly"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col">
          <PlanHeader name="Free" price="$0" note="Forever" current={current === "free"} />
          <Features items={FREE_FEATURES} />
          <Link href="/" className="mt-auto inline-flex min-h-11 items-center justify-center rounded-card border border-border px-4 text-sm font-semibold">
            Play today&apos;s case
          </Link>
        </Card>

        <Card className="flex flex-col ring-4 ring-caption">
          <PlanHeader name="Plus" price={price("plus")} note={note("plus")} current={current === "plus"} badge="Most popular" />
          <Features items={PLUS_FEATURES} />
          {current === "plus" ? (
            <Link href="/settings" className="mt-auto inline-flex min-h-11 items-center justify-center rounded-card border border-border px-4 text-sm font-semibold">
              Manage your plan
            </Link>
          ) : (
            <Link
              href={`/checkout?plan=plus&period=${period}`}
              className="mt-auto inline-flex min-h-11 items-center justify-center rounded-card bg-accent px-4 text-sm font-semibold text-accent-text hover:opacity-90"
            >
              Get Plus
            </Link>
          )}
        </Card>

        <Card className="flex flex-col">
          <PlanHeader name="Family" price={price("family")} note={note("family")} current={false} badge="Coming soon" />
          <Features items={FAMILY_FEATURES} />
          <p className="mt-auto rounded-card bg-surface-muted p-3 text-sm text-muted">Family plans open after the pilot. Plus is available now.</p>
        </Card>
      </div>
    </div>
  );
}

function PlanHeader({ name, price, note, current, badge }: { name: string; price: string; note: string; current: boolean; badge?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-2xl font-semibold">{name}</h2>
        {current ? (
          <span className="rounded-full bg-success px-2 py-0.5 text-xs font-semibold text-white">Your plan</span>
        ) : (
          badge && <span className="rounded-full bg-caption px-2 py-0.5 font-typewriter text-[0.65rem] tracking-wider text-comic-ink uppercase">{badge}</span>
        )}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold">{price}</p>
      <p className="text-sm text-muted">{note}</p>
    </div>
  );
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="my-4 flex flex-col gap-1.5 text-sm">
      {items.map((item) => (
        <li key={item}>
          <span aria-hidden className="mr-2 text-success">
            ✓
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
