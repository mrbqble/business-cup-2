"use client";

import Link from "next/link";

import { Button, Card } from "@/components/ui";

/** Shown when a page fails to render: a way back, never a raw error. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl">
      <Card role="alert">
        <h1 className="font-display text-2xl font-semibold">Something went wrong on this page</h1>
        <p className="mt-2 text-sm text-muted">It&apos;s on our side. Try again, or go back to today&apos;s case.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className="inline-flex min-h-11 items-center underline">
            Today&apos;s case
          </Link>
        </div>
      </Card>
    </main>
  );
}
