import type { OpenClueView, SealedClueView } from "@/lib/case/view";

import { Button } from "./ui";

export function ClueCard({ clue, number, revealedByMistake }: { clue: OpenClueView; number: number; revealedByMistake?: boolean }) {
  return (
    <article id={`clue-${clue.id}`} className="scroll-mt-20 rounded-card border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">
        Clue {number} · {clue.kind}
        {revealedByMistake && <span className="ml-2 normal-case text-danger">shown after a wrong accusation</span>}
      </p>
      <h3 className="mt-1 font-semibold">{clue.headline}</h3>
      <p className="mt-1 text-sm">{clue.body}</p>
      <figure className="mt-3 rounded-card bg-verified-surface p-3">
        <blockquote className="font-display leading-relaxed">&ldquo;{clue.quote}&rdquo;</blockquote>
        <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span
            className="inline-flex items-center gap-1 rounded-full bg-verified px-2 py-0.5 font-semibold text-white"
            title="Code found this exact text in the linked Wikipedia article."
          >
            <span aria-hidden>✓</span> Verified quote
          </span>
          <a href={clue.source.url} target="_blank" rel="noopener noreferrer" className="text-verified underline">
            Wikipedia: {clue.source.title}
          </a>
        </figcaption>
      </figure>
    </article>
  );
}

export function SealedClue({
  clue,
  number,
  disabled,
  onOpen,
}: {
  clue: SealedClueView;
  number: number;
  disabled: boolean;
  onOpen: () => void;
}) {
  return (
    <article
      id={`clue-${clue.id}`}
      className="flex items-center justify-between gap-3 rounded-card border border-dashed border-border bg-surface-muted p-4"
    >
      <div>
        <p className="font-semibold">Clue {number}</p>
        <p className="text-sm text-muted">Sealed {clue.kind}</p>
      </div>
      <Button variant="secondary" disabled={disabled} onClick={onOpen} aria-label={`Open clue ${number} for 100 points`}>
        Open · −100
      </Button>
    </article>
  );
}
