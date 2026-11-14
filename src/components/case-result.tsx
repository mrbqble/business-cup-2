"use client";

import Link from "next/link";

import type { PlayView } from "@/lib/case/view";
import { useMe } from "@/lib/client/me";
import type { Rank } from "@/lib/game/rank";

import { Archivist } from "./archivist";
import { ChallengeBox } from "./challenge-box";
import { ExhibitCredit, ExhibitImage } from "./exhibits";
import { LeaderboardPreview } from "./leaderboard";
import { ShareResult } from "./share-result";
import { Card } from "./ui";

/** The end screen: verdict stamp, the closing panel, rank, then the solution, sources and share card. */
export function CaseResult({
  view,
  playId,
  clueNumbers,
  promotion,
  justEnded,
  challengeSlug = null,
}: {
  view: PlayView;
  playId: string;
  clueNumbers: Map<string, number>;
  promotion: Rank | null;
  justEnded: boolean;
  /** Set when the play came from a challenge link: the end screen leads back to the comparison. */
  challengeSlug?: string | null;
}) {
  if (!view.result) return null;
  const solved = view.status === "solved";
  const { solution, sources, learned } = view.result;
  const cover = view.case.cover;

  return (
    <section aria-labelledby="verdict" className="flex flex-col gap-6">
      <div className="paper relative overflow-hidden rounded-card p-5">
        <p className="font-typewriter text-xs tracking-widest text-muted uppercase">Case report</p>
        <h2 id="verdict" className="mt-1 font-display text-2xl font-semibold">
          {solved ? "You cracked it" : "The trail went cold"}
        </h2>
        <p className="mt-1 max-w-md text-sm">
          {solved ? `You named the answer with ${view.score} points.` : "You ran out of lives, so this case scores 0. Here is what the evidence shows."}
        </p>
        <span
          className={`stamp mt-4 text-3xl sm:absolute sm:top-6 sm:right-6 sm:mt-0 sm:text-4xl ${solved ? "text-stamp-green" : "text-stamp-red"} ${
            justEnded ? "animate-stamp" : "-rotate-6"
          }`}
        >
          {solved ? "Case closed" : "Cold case"}
        </span>
      </div>

      <div className="comic-panel grid rounded-[3px] sm:grid-cols-2">
        {cover && (
          <div className="halftone relative border-b-3 border-comic-ink sm:border-r-3 sm:border-b-0">
            <ExhibitImage exhibit={cover} className="h-full contrast-125 grayscale-[35%]" />
          </div>
        )}
        <div className="flex flex-col justify-center gap-4 p-4 sm:p-5">
          <div className="flex items-end gap-3">
            <Archivist className="h-14 w-14" />
            <p className="speech-bubble mb-3 px-3 py-2 text-sm font-semibold">
              {solved ? "Case closed, Detective." : "This one went cold. The file stays open for you."}
            </p>
          </div>
          {view.narration.closing && (
            <div className="caption-box p-3">
              <p className="font-typewriter text-[0.7rem] tracking-widest uppercase">What happened</p>
              <p className="mt-0.5 text-sm leading-snug font-semibold sm:text-base">{view.narration.closing}</p>
            </div>
          )}
          {cover && (
            <p className="text-[0.7rem] text-comic-ink/70">
              Image: <ExhibitCredit exhibit={cover} />
            </p>
          )}
        </div>
      </div>

      {challengeSlug && (
        <Link
          href={`/c/${encodeURIComponent(challengeSlug)}`}
          className="paper flex min-h-11 items-center justify-between gap-3 rounded-card p-4 font-display text-lg font-semibold ring-4 ring-caption"
        >
          See how you did against your challenger <span aria-hidden>→</span>
        </Link>
      )}

      <RankCard promotion={promotion} />

      <Card>
        <ShareResult view={view} playId={playId} />
        <ChallengeBox caseSlug={view.case.slug} />
        {view.case.kind === "daily" && <LeaderboardPreview slug={view.case.slug} />}

        <h3 className="mt-5 font-semibold">What really happened</h3>
        <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm">
          {solution.map((sentence) => (
            <li key={sentence.text}>
              {sentence.text}{" "}
              {sentence.clueIds.map((id) => (
                <a key={id} href={`#clue-${id}`} className="mr-1 inline-block rounded-full bg-surface-muted px-2 text-xs underline">
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
    </section>
  );
}

/** The player's detective rank, with a promotion flourish when this case earned one. */
function RankCard({ promotion }: { promotion: Rank | null }) {
  const me = useMe();
  const rank = promotion ?? (me.status === "ready" ? me.me.rank : null);
  if (!rank) return null;
  return (
    <div className={`paper flex items-center gap-4 rounded-card p-4 ${promotion ? "animate-pop-in ring-4 ring-caption" : ""}`} aria-live="polite">
      <RankBadge level={rank.level} />
      <div>
        {promotion && <p className="font-typewriter text-xs tracking-widest text-success uppercase">Promoted!</p>}
        <p className="font-display text-xl font-semibold">{rank.name}</p>
        <p className="text-sm text-muted">{nextRankText(rank)}</p>
      </div>
    </div>
  );
}

export function RankBadge({ level, small = false }: { level: number; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 flex-col items-center justify-center rounded-full border-2 border-comic-ink bg-manila text-comic-ink ${
        small ? "h-7 w-7" : "h-14 w-14"
      }`}
    >
      <span className={small ? "text-xs leading-none" : "text-xl leading-none"}>★</span>
      {!small && <span className="mt-0.5 text-[0.55rem] leading-none tracking-[0.2em]">{"•".repeat(level)}</span>}
    </span>
  );
}

function nextRankText(rank: Rank): string {
  if (!rank.next) return "The top rank. The archive salutes you.";
  const { casesToGo, pointsToGo, name } = rank.next;
  const parts = [
    casesToGo > 0 ? `${casesToGo} more case${casesToGo === 1 ? "" : "s"}` : null,
    pointsToGo > 0 ? `${pointsToGo.toLocaleString("en-US")} more points` : null,
  ].filter(Boolean);
  return `${parts.join(" and ")} to ${name}.`;
}
