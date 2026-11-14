import type { Metadata } from "next";
import { Suspense } from "react";

import { LeaderboardPage } from "@/components/leaderboard-page";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Leaderboard" };

export default function CaseLeaderboardPage({ params }: PageProps<"/case/[slug]/leaderboard">) {
  return (
    <main className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<Spinner label="Loading the leaderboard" />}>
        <LeaderboardPage params={params} />
      </Suspense>
    </main>
  );
}
