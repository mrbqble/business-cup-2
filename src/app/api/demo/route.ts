import { connection } from "next/server";

import { buildDemoTour } from "@/lib/demo/tour";
import { json, jsonError } from "@/lib/http";

/** Views for the guided demo (`/demo`, `?demo=1`): a sample case played by script, nothing stored. */
export async function GET(): Promise<Response> {
  await connection();
  const tour = await buildDemoTour();
  if (!tour) return jsonError(404, "demo_unavailable", "The demo case isn't available right now.");
  return json({ tour });
}
