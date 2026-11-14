import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import type { CaseContent, CaseSource, GenerationInfo } from "../case/schema";
import type { VerificationReport } from "../case/verify";
import type { GameAction } from "../game/engine";

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    /** Sequential number of a daily case ("Daily Case #12"). */
    number: integer("number"),
    kind: text("kind", { enum: ["daily", "archive", "topic"] }).notNull(),
    /** America/New_York calendar date of a daily case, YYYY-MM-DD. */
    dateKey: text("date_key"),
    /** Normalized topic of a topic case, used as its cache key. */
    topicKey: text("topic_key"),
    title: text("title").notNull(),
    category: text("category", { enum: ["history", "science"] }).notNull(),
    payload: jsonb("payload").$type<CaseContent>().notNull(),
    sources: jsonb("sources").$type<CaseSource[]>().notNull(),
    verification: jsonb("verification").$type<VerificationReport>().notNull(),
    generation: jsonb("generation").$type<GenerationInfo>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cases_daily_date_key").on(table.dateKey).where(sql`${table.kind} = 'daily'`),
    uniqueIndex("cases_daily_number").on(table.number).where(sql`${table.kind} = 'daily'`),
    uniqueIndex("cases_topic_key").on(table.topicKey).where(sql`${table.kind} = 'topic'`),
  ],
);

export const plays = pgTable(
  "plays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    actions: jsonb("actions").$type<GameAction[]>().notNull().default([]),
    status: text("status", { enum: ["in_progress", "solved", "failed"] }).notNull().default("in_progress"),
    score: integer("score").notNull(),
    livesLeft: integer("lives_left").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("plays_case_id").on(table.caseId)],
);

export type CaseRow = typeof cases.$inferSelect;
export type NewCaseRow = typeof cases.$inferInsert;
export type PlayRow = typeof plays.$inferSelect;
