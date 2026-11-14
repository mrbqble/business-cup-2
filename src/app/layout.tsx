import type { Metadata, Viewport } from "next";
import { Special_Elite } from "next/font/google";
import Link from "next/link";

import { HeaderMenu } from "@/components/header-menu";
import { PlayerChip } from "@/components/player-chip";

import "./globals.css";

/** Typewriter face for case-file labels and quotes (Apache 2.0, self-hosted by next/font). */
const typewriter = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-special-elite", display: "swap" });

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#1d1713" };

export const metadata: Metadata = {
  title: { default: "Daily Case", template: "%s · Daily Case" },
  description:
    "A daily investigation of a real history or science mystery. Open clues, rule out theories, name the answer. Every clue quotes a real source, checked by code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${typewriter.variable}`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border bg-desk-deep/90">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 font-typewriter text-lg tracking-tight whitespace-nowrap sm:text-xl">
              <span aria-hidden className="text-2xl leading-none">🔎</span>
              Daily Case
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <PlayerChip />
              <HeaderMenu />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted">
          Clue quotes come from Wikipedia articles, used under{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline" rel="license">
            CC BY-SA 4.0
          </a>
          . Every quote links to the article it comes from. Exhibit images come from Wikimedia Commons; each shows its author and
          license.
          <span className="mt-3 block">
            <Link href="/pricing" className="inline-flex min-h-11 items-center font-semibold underline">
              Plans and pricing
            </Link>
          </span>
        </footer>
      </body>
    </html>
  );
}
