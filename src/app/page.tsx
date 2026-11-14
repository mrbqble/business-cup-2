import { TodayCase } from "@/components/today-case";
import { TopicForm } from "@/components/topic-form";
import { Card } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex flex-col gap-6">
      <section>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Solve today&apos;s real mystery</h1>
        <p className="mt-2 text-muted">
          Open sealed clues, rule out the wrong theories and name the answer. Every clue quotes a real source, and code checks each
          quote before you see it.
        </p>
      </section>

      <TodayCase />

      <Card aria-labelledby="topic-heading">
        <h2 id="topic-heading" className="font-display text-xl font-semibold">
          Open a case on any topic
        </h2>
        <p className="mt-1 text-sm text-muted">
          Name a history or science question. We build a case from Wikipedia and verify every quote, live, in about a minute.
        </p>
        <TopicForm />
      </Card>
    </main>
  );
}
