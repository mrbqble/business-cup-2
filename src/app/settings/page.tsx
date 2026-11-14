import type { Metadata } from "next";

import { SettingsPanel } from "@/components/settings-panel";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <SettingsPanel />
    </main>
  );
}
