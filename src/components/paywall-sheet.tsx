"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { formatUsd } from "@/lib/client/format";
import { PRICES } from "@/lib/player/entitlements";

export type PaywallReason = "topic" | "archive" | "stats";

const COPY: Record<PaywallReason, { title: string; body: string }> = {
  topic: {
    title: "Unlimited topic cases come with Plus",
    body: "You've used your free case on any topic. With Plus, turn any history or science question into a verified case, any time.",
  },
  archive: {
    title: "The full archive comes with Plus",
    body: "Every past daily case and the curated archive, each clue checked against its source.",
  },
  stats: {
    title: "Personal stats come with Plus",
    body: "Your solve rate, average score, best streak and the road to Chief, in one place.",
  },
};

export const PLUS_BENEFITS = ["Unlimited cases on any topic", "The full case archive", "Personal stats and rank progress"];

/** The upgrade sheet shown at a Plus-only moment. It never appears on today's case or a challenge. */
export function PaywallSheet({ reason, open, onClose }: { reason: PaywallReason; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const { title, body } = COPY[reason];
  const yearly = PRICES.plus.yearly;
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby="paywall-title"
      className="paper m-auto w-[min(92vw,30rem)] rounded-card border-0 p-0 backdrop:bg-black/70"
    >
      <div className="p-5 sm:p-6">
        <p className="font-typewriter text-xs tracking-widest text-muted uppercase">Daily Case Plus</p>
        <h2 id="paywall-title" className="mt-1 font-display text-2xl leading-snug font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm">{body}</p>
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
        <p className="mt-3 text-sm">
          <strong>{formatUsd(yearly)}/year</strong> (about {formatUsd(yearly / 12)} a month) or {formatUsd(PRICES.plus.monthly)}/month. Cancel
          in one click.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/checkout?plan=plus&period=yearly"
            className="inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-sm font-semibold text-accent-text hover:opacity-90"
          >
            Get Plus
          </Link>
          <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-card border border-border px-4 text-sm font-semibold">
            Compare plans
          </Link>
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center px-3 text-sm underline">
            Not now
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">Today&apos;s case and challenge links are always free.</p>
      </div>
    </dialog>
  );
}
