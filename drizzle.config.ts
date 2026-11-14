import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read Next's env files; load the local one when it exists.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  // Migrations use the direct (unpooled) connection.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
