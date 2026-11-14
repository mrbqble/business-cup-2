"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type ArchiveEntry } from "@/lib/client/api";
import { formatDate } from "@/lib/client/format";

import { ExhibitImage } from "./exhibits";
import { PaywallSheet } from "./paywall-sheet";
import { ErrorState, Spinner } from "./ui";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; cases: ArchiveEntry[] };

async function loadArchive(): Promise<State> {
  try {
    return { status: "ready", cases: (await api.archive()).cases };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Something went wrong." };
  }
}

/** Past daily cases and the curated archive; locked cards open the Plus sheet. */
export function ArchiveList() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void loadArchive().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state.status === "loading") return <Spinner label="Opening the archive" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={() => setAttempt((n) => n + 1)} />;
  if (state.cases.length === 0) return <p className="text-muted">The archive is empty for now. Today&apos;s case is on the home page.</p>;

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.cases.map((entry) => (
          <li key={entry.slug}>
            <ArchiveCard entry={entry} onLocked={() => setSheetOpen(true)} />
          </li>
        ))}
      </ul>
      <PaywallSheet reason="archive" open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function ArchiveCard({ entry, onLocked }: { entry: ArchiveEntry; onLocked: () => void }) {
  const label = entry.kind === "daily" && entry.number ? `Daily Case #${entry.number} · ${formatDate(`${entry.dateKey}T12:00:00Z`)}` : "Archive case";
  const body = (
    <>
      <div className="relative">
        {entry.cover ? (
          <ExhibitImage exhibit={entry.cover} />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-surface-muted font-display text-4xl">?</div>
        )}
        {entry.locked && (
          <span className="stamp absolute top-3 right-3 rotate-6 bg-paper/90 text-sm text-stamp-red">
            <span aria-hidden>🔒 </span>Plus
          </span>
        )}
        {entry.status && entry.status !== "in_progress" && (
          <span className="stamp absolute top-3 right-3 rotate-6 bg-paper/90 text-sm text-stamp-green">{entry.status === "solved" ? "Solved" : "Closed"}</span>
        )}
      </div>
      <div className="p-3">
        <p className="font-typewriter text-[0.7rem] tracking-wider text-muted uppercase">
          {label} · {entry.category}
        </p>
        <p className="mt-1 font-display text-lg leading-snug font-semibold">{entry.title}</p>
      </div>
    </>
  );

  return entry.locked ? (
    <button type="button" onClick={onLocked} className="paper block w-full overflow-hidden rounded-card text-left" aria-label={`${entry.title} (Plus)`}>
      {body}
    </button>
  ) : (
    <Link href={`/case/${entry.slug}`} className="paper block overflow-hidden rounded-card">
      {body}
    </Link>
  );
}
