import type { Metadata } from "next";
import { Suspense } from "react";

import { ChallengePage } from "@/components/challenge-page";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "You've been challenged",
  description: "Play the same real mystery as your own anonymous player. No sign-up, and no spoilers until you finish.",
};

export default function Challenge({ params }: PageProps<"/c/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<Spinner label="Opening the challenge" />}>
        <ChallengePage params={params} />
      </Suspense>
    </main>
  );
}
