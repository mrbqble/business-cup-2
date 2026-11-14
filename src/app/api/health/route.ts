import { connection } from "next/server";

import { generationProviderList, isAiConfigured } from "@/lib/ai";
import { checkDatabase } from "@/lib/db/health";

export interface HealthResponse {
  ok: boolean;
  commit: string;
  env: string;
  deps: { db: "ok" | "failed"; ai: "configured" | "missing"; aiProviders: string[] };
  time: string;
}

/** Polled by the uptime monitor: one cheap database query and a config check, never a paid model call. */
export async function GET(): Promise<Response> {
  // Opt out of build-time prerendering so every hit reflects the running deployment.
  await connection();

  const db = await checkDatabase();
  const providers = generationProviderList();
  const body: HealthResponse = {
    ok: db === "ok",
    commit: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    env: process.env.VERCEL_ENV || "development",
    deps: {
      db,
      ai: isAiConfigured(providers) ? "configured" : "missing",
      aiProviders: providers.split(",").map((name) => name.trim()),
    },
    time: new Date().toISOString(),
  };

  return Response.json(body, { status: body.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
