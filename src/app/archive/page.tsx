import type { Metadata } from "next";

import { ArchiveList } from "@/components/archive-list";

export const metadata: Metadata = { title: "Case archive" };

export default function ArchivePage() {
  return (
    <main className="flex flex-col gap-5">
      <header className="max-w-2xl">
        <p className="font-typewriter text-sm tracking-widest text-muted uppercase">Case archive</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Every case, every quote verified</h1>
        <p className="mt-2 text-muted">Past daily cases and curated investigations. Today&apos;s case is always free; the archive comes with Plus.</p>
      </header>
      <ArchiveList />
    </main>
  );
}
