"use client";

import { useState } from "react";

import type { PlayView } from "@/lib/case/view";

import { Button } from "./ui";

/** The spoiler-free share text: case label, grid and score, plus a link whose preview never shows the answer. */
export function shareText(view: PlayView, url: string): string {
  const label = view.case.kind === "daily" && view.case.number ? `Daily Case #${view.case.number}` : "Daily Case";
  return `${label} ${view.result?.grid ?? ""} ${view.score}\n${url}`;
}

export function ShareResult({ view, playId }: { view: PlayView; playId: string }) {
  const [feedback, setFeedback] = useState<string | null>(null);
  if (!view.result) return null;

  async function share() {
    const text = shareText(view, `${window.location.origin}/s/${playId}`);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setFeedback("Copied. Paste it anywhere: it never reveals the answer.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeedback("Couldn't share from this browser. Copy the result above instead.");
    }
  }

  return (
    <div className="mt-5 rounded-card border border-border bg-surface p-3">
      <p className="text-sm font-semibold">Share your result</p>
      <p className="mt-1 font-mono text-lg tracking-wider" aria-label="Your result grid">
        {view.result.grid} {view.score}
      </p>
      <Button className="mt-2" onClick={() => void share()}>
        Share result
      </Button>
      <p aria-live="polite" className="mt-2 text-xs text-muted">
        {feedback}
      </p>
    </div>
  );
}
