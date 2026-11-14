"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { api, type PlanInfo } from "@/lib/client/api";
import { formatDate, formatUsd } from "@/lib/client/format";
import { refreshMe } from "@/lib/client/me";
import { PRICES, type BillingPeriod } from "@/lib/player/entitlements";

import { PLUS_BENEFITS } from "./paywall-sheet";
import { Button, Card } from "./ui";

type State = { status: "review" | "processing" } | { status: "done"; plan: PlanInfo } | { status: "error"; message: string };

/** Demo checkout: a clearly labelled order review, no payment fields, then the plan is granted for real. */
export function CheckoutFlow() {
  const params = useSearchParams();
  const plan = params.get("plan") === "family" ? "family" : "plus";
  const [period, setPeriod] = useState<BillingPeriod>(params.get("period") === "monthly" ? "monthly" : "yearly");
  const [state, setState] = useState<State>({ status: "review" });

  if (plan === "family") {
    return (
      <Card>
        <h1 className="font-display text-2xl font-semibold">Family plans open soon</h1>
        <p className="mt-2 text-sm text-muted">Family is not on sale during the pilot. Plus is available now.</p>
        <Link href="/checkout?plan=plus&period=yearly" className="mt-4 inline-flex min-h-11 items-center font-semibold underline">
          Get Plus instead
        </Link>
      </Card>
    );
  }

  async function confirm() {
    setState({ status: "processing" });
    try {
      const { plan: granted } = await api.checkout("plus", period);
      void refreshMe();
      setState({ status: "done", plan: granted });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    }
  }

  if (state.status === "done") {
    return (
      <Card aria-live="polite">
        <p className="stamp -rotate-3 text-xl text-stamp-green">Plus active</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">Welcome to Plus</h1>
        <p className="mt-2 text-sm">
          Your {state.plan.period} plan runs until {formatDate(state.plan.expiresAt)}. This was a demo checkout: nothing was charged. Cancel
          anytime in Settings, in one click.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/archive" className="inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-accent-text">
            Open the archive
          </Link>
          <Link href="/stats" className="inline-flex min-h-11 items-center underline">
            Your stats
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center underline">
            Today&apos;s case
          </Link>
        </div>
      </Card>
    );
  }

  const amount = PRICES.plus[period];
  return (
    <div className="flex flex-col gap-4">
      <p role="note" className="rounded-card border-2 border-caption bg-caption/15 p-3 text-sm font-semibold">
        Demo: no real payment. No card is needed and nothing is charged; confirming turns Plus on for this device.
      </p>
      <Card>
        <h1 className="font-display text-2xl font-semibold">Daily Case Plus</h1>
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {PLUS_BENEFITS.map((benefit) => (
            <li key={benefit}>
              <span aria-hidden className="mr-2 text-success">
                ✓
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">Billing</legend>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {(["yearly", "monthly"] as const).map((option) => (
              <label key={option} className={`flex min-h-11 flex-1 cursor-pointer items-center gap-2 rounded-card border p-3 text-sm ${period === option ? "border-accent" : "border-border"}`}>
                <input type="radio" name="period" value={option} checked={period === option} onChange={() => setPeriod(option)} />
                {option === "yearly" ? `${formatUsd(PRICES.plus.yearly)} per year` : `${formatUsd(PRICES.plus.monthly)} per month`}
              </label>
            ))}
          </div>
        </fieldset>

        <dl className="mt-4 flex flex-col gap-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Due today (demo)</dt>
            <dd className="font-semibold">{formatUsd(0)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>List price</dt>
            <dd>
              {formatUsd(amount)} / {period === "yearly" ? "year" : "month"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={() => void confirm()} disabled={state.status === "processing"}>
            {state.status === "processing" ? "Turning on Plus…" : "Start Plus (demo)"}
          </Button>
          <Link href="/pricing" className="inline-flex min-h-11 items-center text-sm underline">
            Back to plans
          </Link>
        </div>
        {state.status === "error" && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {state.message}
          </p>
        )}
        <p className="mt-3 text-xs text-muted">Cancel anytime in Settings with one click. You keep Plus until the end of the period.</p>
      </Card>
    </div>
  );
}
