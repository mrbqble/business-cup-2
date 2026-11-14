import type { Metadata } from "next";
import Link from "next/link";

import { PlayerChip } from "@/components/player-chip";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Daily Case", template: "%s · Daily Case" },
  description:
    "A daily investigation of a real history or science mystery. Open clues, rule out theories, name the answer. Every clue quotes a real source, checked by code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex w-full max-w-2xl items-baseline justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-display text-xl font-semibold tracking-tight">
              Daily Case
            </Link>
            <PlayerChip />
          </div>
        </header>
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</div>
        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
          Clue quotes come from Wikipedia articles, used under{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline" rel="license">
            CC BY-SA 4.0
          </a>
          . Every quote links to the article it comes from.
        </footer>
      </body>
    </html>
  );
}
