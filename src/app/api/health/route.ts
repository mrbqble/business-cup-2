import { connection } from "next/server";

import { isAiConfigured } from "@/lib/ai";

export interface HealthResponse {
  ok: boolean;
  commit: string;
  env: string;
  deps: { ai: "configured" | "missing" };
  time: string;
}

/** Polled by the uptime monitor: config checks only, never a paid provider call. */
export async function GET(): Promise<Response> {
  // Opt out of build-time prerendering so every hit reflects the running deployment.
  await connection();

  const body: HealthResponse = {
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    env: process.env.VERCEL_ENV || "development",
    deps: { ai: isAiConfigured(process.env.AI_PROVIDERS) ? "configured" : "missing" },
    time: new Date().toISOString(),
  };

  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
