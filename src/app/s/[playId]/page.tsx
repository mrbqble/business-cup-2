import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import { Card, Spinner } from "@/components/ui";
import { getSharedResult } from "@/lib/play/service";

export const metadata: Metadata = {
  title: "A Daily Case result",
  description: "Someone solved today's real mystery. Every clue quotes a real source, checked by code. Can you beat their score?",
};

export default function SharedResultPage({ params }: PageProps<"/s/[playId]">) {
  return (
    <main className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<Spinner label="Loading the result" />}>
        <SharedResult params={params} />
      </Suspense>
    </main>
  );
}

/** A shared result shows who played, the grid and the score, never the answer. */
async function SharedResult({ params }: { params: Promise<{ playId: string }> }) {
  await connection();
  const { playId } = await params;
  const result = z.uuid().safeParse(playId).success ? await getSharedResult(playId) : null;

  if (!result) {
    return (
      <Card>
        <p>This result isn&apos;t available.</p>
        <Link href="/" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline">
          Play today&apos;s case
        </Link>
      </Card>
    );
  }

  const label = result.case.kind === "daily" && result.case.number ? `Daily Case #${result.case.number}` : "a Daily Case";
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        <span aria-hidden>{result.player.avatar}</span> {result.player.nickname}{" "}
        {result.status === "solved" ? `solved ${label} with ${result.score} points` : `took on ${label}`}
      </p>
      <h1 className="font-display text-2xl leading-snug font-semibold">{result.case.title}</h1>
      <p className="font-mono text-2xl tracking-wider" aria-label="Their result grid">
        {result.grid}
      </p>
      <p className="text-sm text-muted">🔎 clue opened · ⬛ clue left sealed · ❌ wrong accusation · ✅ solved</p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center self-start rounded-card bg-accent px-4 py-2 text-sm font-semibold text-accent-text hover:opacity-90"
      >
        Can you beat it? Play today&apos;s case
      </Link>
    </Card>
  );
}
