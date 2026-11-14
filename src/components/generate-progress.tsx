"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, generateCase, type GenerateEvent } from "@/lib/client/api";

import { Button, Card, ErrorState } from "./ui";

type Stage = "checking_topic" | "finding_sources" | "drafting_clues" | "checking_citations" | "repairing";

const STEPS: { stage: Stage; label: string }[] = [
  { stage: "checking_topic", label: "Checking the topic" },
  { stage: "finding_sources", label: "Finding sources on Wikipedia" },
  { stage: "drafting_clues", label: "Drafting clues" },
  { stage: "checking_citations", label: "Checking every quote against the sources" },
];

type Outcome = { kind: "running" } | { kind: "refused"; message: string } | { kind: "failed"; message: string; retryable: boolean };

export function GenerateProgress() {
  const router = useRouter();
  const topic = useSearchParams().get("topic")?.trim() ?? "";
  const [stage, setStage] = useState<Stage>("checking_topic");
  const [detail, setDetail] = useState<string | null>(null);
  const [repairs, setRepairs] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "running" });
  const started = useRef(false);

  const run = useCallback(async () => {
    setStage("checking_topic");
    setDetail(null);
    setRepairs(null);
    setOutcome({ kind: "running" });
    const onEvent = (event: GenerateEvent) => {
      if (event.type === "progress") {
        if (event.stage === "repairing") setRepairs(event.message);
        else setStage(event.stage);
        setDetail(event.message);
      } else if (event.type === "done") {
        router.replace(`/case/${event.slug}`);
      } else if (event.type === "refused") {
        setOutcome({ kind: "refused", message: event.message });
      } else {
        setOutcome({ kind: "failed", message: event.message, retryable: event.retryable });
      }
    };
    try {
      await generateCase(topic, onEvent);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) setOutcome({ kind: "refused", message: error.message });
      else if (error instanceof ApiError && error.status === 429) {
        setOutcome({ kind: "failed", message: "You've opened 3 new cases this hour. Try again later, or play today's case.", retryable: false });
      } else setOutcome({ kind: "failed", message: error instanceof Error ? error.message : "Something went wrong.", retryable: true });
    }
  }, [router, topic]);

  useEffect(() => {
    // Generation costs real money: start it once, even when React runs effects twice in development.
    if (started.current || !topic) return;
    started.current = true;
    void run();
  }, [run, topic]);

  if (!topic) {
    return (
      <ErrorState message="Name a topic to build a case.">
        <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
          Back to the home page
        </Link>
      </ErrorState>
    );
  }

  const current = STEPS.findIndex((s) => s.stage === stage);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">New case</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{topic}</h1>
      </div>

      {outcome.kind === "running" && (
        <Card aria-live="polite">
          <ol className="flex flex-col gap-3">
            {STEPS.map((step, index) => {
              const state = index < current ? "done" : index === current ? "active" : "waiting";
              return (
                <li key={step.stage} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                      state === "done"
                        ? "border-verified bg-verified text-white"
                        : state === "active"
                          ? "animate-pulse border-accent"
                          : "border-border"
                    }`}
                  >
                    {state === "done" ? "✓" : ""}
                  </span>
                  <span className={state === "waiting" ? "text-muted" : ""}>
                    {step.label}
                    {state === "active" && detail && detail !== step.label && <span className="block text-sm text-muted">{detail}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          {repairs && <p className="mt-3 text-sm text-muted">Some quotes didn&apos;t match the source exactly. {repairs}.</p>}
          <p className="mt-4 text-xs text-muted">This usually takes under a minute. Every quote is checked against Wikipedia before you see it.</p>
        </Card>
      )}

      {outcome.kind === "refused" && (
        <ErrorState message={outcome.message}>
          <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
            Try another topic
          </Link>
        </ErrorState>
      )}

      {outcome.kind === "failed" && (
        <ErrorState message={outcome.message} onRetry={outcome.retryable ? () => void run() : undefined}>
          <Link href="/" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
            Back to the home page
          </Link>
        </ErrorState>
      )}

      {outcome.kind !== "running" && (
        <Button variant="secondary" className="self-start" onClick={() => router.push("/")}>
          Play today&apos;s case instead
        </Button>
      )}
    </div>
  );
}
