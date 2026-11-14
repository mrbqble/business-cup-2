"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** `?demo=1` on the home page starts the guided demo. */
export function DemoEntry() {
  const router = useRouter();
  const demo = useSearchParams().get("demo") === "1";
  useEffect(() => {
    if (demo) router.replace("/demo");
  }, [demo, router]);
  return null;
}
