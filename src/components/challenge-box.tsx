"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/client/api";

import { QrCode } from "./qr-code";
import { Button } from "./ui";

type State = { status: "idle" | "creating" } | { status: "ready"; slug: string; url: string } | { status: "error"; message: string };

/** "Challenge a friend": a link to the same case; the challenger's result stays hidden until the friend finishes. */
export function ChallengeBox({ caseSlug }: { caseSlug: string }) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [feedback, setFeedback] = useState<string | null>(null);

  async function create() {
    setState({ status: "creating" });
    try {
      const { slug } = await api.createChallenge(caseSlug);
      setState({ status: "ready", slug, url: `${window.location.origin}/c/${slug}` });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Something went wrong. Please try again." });
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Link copied.");
    } catch {
      setFeedback("Couldn't copy here. Select the link and copy it.");
    }
  }

  async function share(url: string) {
    try {
      await navigator.share({ title: "Daily Case challenge", text: "Can you crack this case faster than me? No sign-up, no spoilers.", url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setFeedback("Couldn't open sharing. Copy the link instead.");
    }
  }

  return (
    <div className="mt-5 rounded-card border-2 border-dashed border-border p-4">
      <p className="font-display text-lg font-semibold">Challenge a friend</p>
      <p className="mt-1 text-sm text-muted">
        Send a link to this case. Your friend plays it as their own player, no sign-up, and your result stays sealed until they finish.
      </p>

      {state.status !== "ready" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={() => void create()} disabled={state.status === "creating"}>
            {state.status === "creating" ? "Creating the link…" : "Create a challenge link"}
          </Button>
          {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
        </div>
      )}

      {state.status === "ready" && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <label htmlFor="challenge-link" className="text-xs font-semibold text-muted">
              Challenge link
            </label>
            <input
              id="challenge-link"
              readOnly
              value={state.url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-h-11 w-full rounded-card border border-border bg-bg px-3 font-typewriter text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void copy(state.url)}>Copy link</Button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button variant="secondary" onClick={() => void share(state.url)}>
                  Share…
                </Button>
              )}
              <Link href={`/c/${state.slug}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold underline">
                See who took it
              </Link>
            </div>
            <p aria-live="polite" className="text-xs text-muted">
              {feedback ?? "Testing alone? Open the link in a private window: it plays as a brand-new anonymous player."}
            </p>
          </div>
          <QrCode value={state.url} label="QR code for the challenge link" className="hidden w-36 shrink-0 sm:block" />
        </div>
      )}
    </div>
  );
}
