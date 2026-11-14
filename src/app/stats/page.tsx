import type { Metadata } from "next";

import { StatsPanel } from "@/components/stats-panel";

export const metadata: Metadata = { title: "Your stats" };

export default function StatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold">Your stats</h1>
      <StatsPanel />
    </main>
  );
}
