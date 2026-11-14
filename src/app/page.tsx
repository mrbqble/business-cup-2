import Link from "next/link";
import { Suspense } from "react";

import { DemoEntry } from "@/components/demo-entry";
import { PlayerRecord } from "@/components/player-record";
import { TodayCase } from "@/components/today-case";
import { TopicForm } from "@/components/topic-form";
import { Card } from "@/components/ui";

const HOW_IT_WORKS = [
  ["Read real evidence", "Every clue quotes a real source. Code checks each quote, word for word, before you see it."],
  ["Open files, rule out theories", "Sealed files cost points and wrong accusations cost lives. Fewer clues, higher score."],
  ["Name the answer", "Learn what really happened, share a spoiler-free grid and challenge a friend."],
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Suspense>
        <DemoEntry />
      </Suspense>

      <section>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">A real mystery to solve every day</h1>
        <p className="mt-2 text-muted">
          Daily Case is a detective game made of real history and science. Ten minutes, the same case for everyone, and you finish knowing
          something true.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {HOW_IT_WORKS.map(([title, text], index) => (
            <li key={title} className="rounded-card border border-border p-3">
              <p className="font-typewriter text-xs tracking-widest text-muted uppercase">Step {index + 1}</p>
              <p className="mt-1 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <TodayCase />
      <PlayerRecord />

      <Card aria-labelledby="topic-heading">
        <h2 id="topic-heading" className="font-display text-xl font-semibold">
          Open a case on any topic
        </h2>
        <p className="mt-1 text-sm text-muted">
          Name a history or science question. We build a case from Wikipedia and verify every quote, live, in under a minute.
        </p>
        <TopicForm />
      </Card>

      <p className="text-sm text-muted">
        Today&apos;s case is free, every day.{" "}
        <Link href="/pricing" className="font-semibold underline">
          Plus
        </Link>{" "}
        opens the archive, unlimited topic cases and personal stats.{" "}
        <Link href="/demo" className="font-semibold underline">
          Take the 60-second tour
        </Link>
        .
      </p>
    </main>
  );
}
