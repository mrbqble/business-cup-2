import type { Metadata } from "next";
import { Suspense } from "react";

import { GenerateProgress } from "@/components/generate-progress";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Building your case" };

export default function NewCasePage() {
  return (
    <main className="mx-auto w-full max-w-2xl">
      <Suspense fallback={<Spinner label="Loading" />}>
        <GenerateProgress />
      </Suspense>
    </main>
  );
}
