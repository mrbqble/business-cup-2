import Link from "next/link";

import type { PlayView } from "@/lib/case/view";

import { Card } from "./ui";

export function CaseResult({ view, clueNumbers }: { view: PlayView; clueNumbers: Map<string, number> }) {
  if (!view.result) return null;
  const solved = view.status === "solved";
  const { solution, sources, learned } = view.result;

  return (
    <Card aria-labelledby="verdict" className={solved ? "border-success bg-success-surface" : "border-danger bg-danger-surface"}>
      <h2 id="verdict" className="font-display text-2xl font-semibold">
        {solved ? "Case solved" : "Case closed"}
      </h2>
      <p className="mt-1 text-sm">
        {solved ? `You named the answer with ${view.score} points.` : "You ran out of lives. Here is what the evidence shows."}
      </p>

      <h3 className="mt-5 font-semibold">What really happened</h3>
      <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm">
        {solution.map((sentence) => (
          <li key={sentence.text}>
            {sentence.text}{" "}
            {sentence.clueIds.map((id) => (
              <a key={id} href={`#clue-${id}`} className="mr-1 inline-block rounded-full bg-surface px-2 text-xs underline">
                clue {clueNumbers.get(id)}
              </a>
            ))}
          </li>
        ))}
      </ol>

      <h3 className="mt-5 font-semibold">What you learned</h3>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
        {learned.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <h3 className="mt-5 font-semibold">Sources</h3>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
              Wikipedia: {source.title}
            </a>{" "}
            <a
              href={`https://en.wikipedia.org/w/index.php?oldid=${source.revisionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted underline"
            >
              (the revision we quoted)
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-accent-text hover:opacity-90">
          Open a case on any topic
        </Link>
      </div>
    </Card>
  );
}
