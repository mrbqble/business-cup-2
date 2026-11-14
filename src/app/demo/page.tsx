import type { Metadata } from "next";

import { DemoTour } from "@/components/demo-tour";

export const metadata: Metadata = {
  title: "Demo",
  description: "A guided tour of Daily Case on a sample case: briefing, verified clues, accusations, verdict, challenge link and pricing.",
};

export default function DemoPage() {
  return (
    <main>
      <DemoTour />
    </main>
  );
}
