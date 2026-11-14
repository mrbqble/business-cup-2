"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { useMe } from "@/lib/client/me";

/** Site menu; Plus-only places carry a Plus tag for free players. */
export function HeaderMenu() {
  const me = useMe();
  const plus = me.status === "ready" && me.me.plan.plan !== "free";

  // A link inside <details> doesn't close it on client-side navigation.
  const close = (event: MouseEvent<HTMLElement>) => {
    const details = event.currentTarget.closest("details");
    if (details) details.open = false;
  };

  return (
    <details className="relative">
      <summary
        aria-label="Menu"
        className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-card border border-border text-lg [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden>☰</span>
      </summary>
      <nav aria-label="Site" onClick={close} className="paper absolute top-full right-0 z-40 mt-2 flex w-60 flex-col rounded-card p-2">
        <MenuLink href="/">Today&apos;s case</MenuLink>
        <MenuLink href="/archive" plusOnly={!plus}>
          Case archive
        </MenuLink>
        <MenuLink href="/stats" plusOnly={!plus}>
          Your stats
        </MenuLink>
        <MenuLink href="/pricing">Plans and pricing</MenuLink>
        <MenuLink href="/settings">Settings</MenuLink>
      </nav>
    </details>
  );
}

function MenuLink({ href, plusOnly = false, children }: { href: string; plusOnly?: boolean; children: ReactNode }) {
  return (
    <Link href={href} className="flex min-h-11 items-center justify-between gap-2 rounded-card px-3 text-sm font-semibold hover:bg-surface-muted">
      {children}
      {plusOnly && <span className="rounded-full bg-caption px-2 py-0.5 font-typewriter text-[0.65rem] tracking-wider text-comic-ink uppercase">Plus</span>}
    </Link>
  );
}
