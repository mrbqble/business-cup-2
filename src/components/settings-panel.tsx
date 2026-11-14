"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/client/api";
import { formatDate } from "@/lib/client/format";
import { refreshMe, useMe } from "@/lib/client/me";

import { Button, Card, ErrorState, Spinner } from "./ui";

/** The player's plan with a one-click cancel: no retention maze, no hidden steps. */
export function SettingsPanel() {
  const me = useMe();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (me.status === "loading") return <Spinner label="Loading your settings" />;
  if (me.status === "error") return <ErrorState message="We couldn't load your settings." onRetry={() => void refreshMe()} />;

  const { player, plan } = me.me;

  async function cancel() {
    setPending(true);
    setMessage(null);
    try {
      const { plan: updated } = await api.cancelPlan();
      await refreshMe();
      setMessage(`Canceled. You keep Plus until ${formatDate(updated.expiresAt)}, then you're back on Free. Nothing more will be charged.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="font-display text-xl font-semibold">Your player</h2>
        <p className="mt-2 text-sm">
          <span aria-hidden className="mr-1 text-lg">
            {player.avatar}
          </span>
          {player.nickname}
        </p>
        <p className="mt-1 text-xs text-muted">No account needed: this player lives in this browser. Clearing site data starts a new one.</p>
      </Card>

      <Card aria-live="polite">
        <h2 className="font-display text-xl font-semibold">Your plan</h2>
        {plan.plan === "free" ? (
          <>
            <p className="mt-2 text-sm">Free: today&apos;s case, streaks, leaderboards, challenges and 1 new topic case.</p>
            <Link href="/pricing" className="mt-3 inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-sm font-semibold text-accent-text">
              See Plus
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm">
              <strong>Plus</strong>, billed {plan.period === "monthly" ? "monthly" : "yearly"} (demo).{" "}
              {plan.canceled ? `Canceled: Plus ends on ${formatDate(plan.expiresAt)}.` : `Renews on ${formatDate(plan.expiresAt)}.`}
            </p>
            {!plan.canceled && (
              <Button variant="secondary" className="mt-3" disabled={pending} onClick={() => void cancel()}>
                {pending ? "Canceling…" : "Cancel plan"}
              </Button>
            )}
            {plan.canceled && (
              <Link href="/checkout?plan=plus&period=yearly" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline">
                Start Plus again
              </Link>
            )}
          </>
        )}
        {message && <p className="mt-3 text-sm">{message}</p>}
      </Card>
    </div>
  );
}
