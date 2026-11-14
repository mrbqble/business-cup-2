import type { Metadata } from "next";

import { PricingPlans } from "@/components/pricing-plans";

export const metadata: Metadata = { title: "Plans and pricing" };

export default function PricingPage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <p className="font-typewriter text-sm tracking-widest text-muted uppercase">Plans and pricing</p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Today&apos;s case is free. Plus opens every case.</h1>
        <p className="mt-2 text-muted">
          Each new case is researched from real sources and every quote is checked by code, which costs real AI and compute. Plus pays for that.
          No ads, no data selling, and you cancel in one click in Settings.
        </p>
      </header>
      <PricingPlans />
      <p className="text-sm text-muted">Prices in US dollars. During the pilot, checkout is a demo: nothing is charged.</p>
    </main>
  );
}
