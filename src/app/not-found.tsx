import Link from "next/link";

import { Card } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl">
      <Card>
        <p className="stamp -rotate-3 text-xl text-stamp-red">File missing</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-muted">The link may be mistyped, or the case was moved to the archive.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-card bg-accent px-4 text-accent-text">
            Play today&apos;s case
          </Link>
          <Link href="/archive" className="inline-flex min-h-11 items-center underline">
            Case archive
          </Link>
        </div>
      </Card>
    </main>
  );
}
