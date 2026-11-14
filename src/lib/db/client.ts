import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export type Database = NeonHttpDatabase<typeof schema>;

let database: Database | undefined;

/** One HTTP-based client per process; each query is a single request, which suits serverless. */
export function getDb(): Database {
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    database = drizzle(neon(url), { schema });
  }
  return database;
}
