import type { Metadata } from "next";
import { Suspense } from "react";

import { CasePlayer } from "@/components/case-player";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Case file" };

export default function CasePage({ params }: PageProps<"/case/[slug]">) {
  return (
    <main>
      <Suspense fallback={<Spinner label="Opening the case file" />}>
        <CasePlayer params={params} />
      </Suspense>
    </main>
  );
}
