"use client";

import type { ClueKind } from "@/lib/case/schema";
import type { OpenClueView, SealedClueView } from "@/lib/case/view";
import type { Exhibit } from "@/lib/sources/exhibits";

import { ExhibitCredit, ExhibitImage } from "./exhibits";
import { TypewriterText } from "./typewriter";
import { Button } from "./ui";

const KIND_LABELS: Record<ClueKind, string> = {
  document: "Document",
  testimony: "Testimony",
  record: "Record",
  artifact: "Artifact",
};

/**
 * An opened clue, styled by kind: typed document, index-card testimony, ledger record, or an
 * artifact polaroid when an exhibit fits. `fresh` plays the flip, the stamp and the typewriter.
 */
export function ClueCard({
  clue,
  number,
  exhibit,
  revealedByMistake = false,
  fresh = false,
  highlighted = false,
}: {
  clue: OpenClueView;
  number: number;
  exhibit: Exhibit | null;
  revealedByMistake?: boolean;
  fresh?: boolean;
  highlighted?: boolean;
}) {
  return (
    <article
      id={`clue-${clue.id}`}
      className={`paper clue-${clue.kind} relative scroll-mt-24 rounded-card p-4 pt-5 ${fresh ? "animate-flip-in" : ""} ${
        highlighted ? "animate-pulse-ring" : ""
      }`}
    >
      <p className="font-typewriter text-xs tracking-wider text-muted uppercase">
        Clue {number} · {KIND_LABELS[clue.kind]}
        {revealedByMistake && <span className="ml-2 text-danger normal-case">shown after a wrong accusation</span>}
      </p>

      {clue.kind === "artifact" && exhibit && (
        <figure className="float-right mt-1 mb-2 ml-3 w-32 rotate-2 bg-white p-1.5 pb-2 shadow-md sm:w-40">
          <ExhibitImage exhibit={exhibit} />
          <figcaption className="mt-1 text-[0.6rem] leading-tight text-muted">
            <ExhibitCredit exhibit={exhibit} />
          </figcaption>
        </figure>
      )}

      <h3 className="mt-1 font-display text-lg leading-snug font-semibold">{clue.headline}</h3>
      <p className="mt-1 text-sm">{clue.body}</p>

      <figure className="relative clear-both mt-3">
        {clue.kind === "testimony" && (
          <span aria-hidden className="absolute -top-4 -left-1 font-display text-5xl leading-none text-stamp-red/40">
            &ldquo;
          </span>
        )}
        <blockquote className={`font-typewriter leading-relaxed ${clue.kind === "testimony" ? "pl-5" : ""}`}>
          &ldquo;
          <TypewriterText text={clue.quote} animate={fresh} />
          &rdquo;
        </blockquote>
        <figcaption className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span
            className={`stamp text-sm text-stamp-green ${fresh ? "animate-stamp" : "-rotate-6"}`}
            title="Code found this exact text in the linked Wikipedia article."
          >
            ✓ Verified quote
          </span>
          <a
            href={clue.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-verified underline"
          >
            Wikipedia: {clue.source.title}
          </a>
        </figcaption>
      </figure>
    </article>
  );
}

/** A face-down case file with its price tag. */
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
    <article id={`clue-${clue.id}`} className="case-folder mt-3 flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="font-typewriter text-xs tracking-[0.18em] uppercase opacity-75">Case file · clue {number}</p>
        <p className="mt-1 font-display text-lg font-semibold">Sealed {KIND_LABELS[clue.kind].toLowerCase()}</p>
        <p className="stamp mt-2 -rotate-3 text-[0.65rem] text-stamp-red">Confidential</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="cost-tag py-1 pr-2 font-typewriter text-sm shadow-sm">−100 pts</span>
        <Button variant="secondary" disabled={disabled} onClick={onOpen} aria-label={`Open clue ${number} for 100 points`}>
          Open file
        </Button>
      </div>
    </article>
  );
}
