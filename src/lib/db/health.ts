import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "./client";

/** A cheap round trip with a short timeout; never throws. */
export async function checkDatabase(timeoutMs = 2_000): Promise<"ok" | "failed"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"failed">((resolve) => {
    timer = setTimeout(() => resolve("failed"), timeoutMs);
  });
  const query = getDb()
    .execute(sql`select 1`)
    .then(() => "ok" as const)
    .catch(() => "failed" as const);
  try {
    return await Promise.race([query, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
