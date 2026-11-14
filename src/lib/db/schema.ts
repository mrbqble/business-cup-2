import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import type { Narration } from "../case/narration";
import type { CaseContent, CaseSource, GenerationInfo } from "../case/schema";
import type { VerificationReport } from "../case/verify";
import type { GameAction } from "../game/engine";
import type { Exhibit } from "../sources/exhibits";

/** An anonymous player: one per device, identified by a secret token whose hash is stored here. */
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  nickname: text("nickname").notNull(),
  avatar: text("avatar").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  /** Paid plan (demo checkout); it counts until planExpiresAt, also after a cancel. */
  plan: text("plan", { enum: ["free", "plus", "family"] }).notNull().default("free"),
  planPeriod: text("plan_period", { enum: ["monthly", "yearly"] }),
  planStartedAt: timestamp("plan_started_at", { withTimezone: true }),
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  /** Set when the player cancels: no renewal, access until planExpiresAt. */
  planCanceledAt: timestamp("plan_canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
    /** Free-licensed Wikimedia Commons images from the sources; the first is the cover. */
    exhibits: jsonb("exhibits").$type<Exhibit[]>().notNull().default([]),
    /** Comic-panel captions; null until written (the view then uses the case's own words). */
    narration: jsonb("narration").$type<Narration>(),
    /** The player who asked for a topic case; counts toward their free topic cases. */
    createdBy: uuid("created_by").references(() => players.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cases_daily_date_key").on(table.dateKey).where(sql`${table.kind} = 'daily'`),
    uniqueIndex("cases_daily_number").on(table.number).where(sql`${table.kind} = 'daily'`),
    uniqueIndex("cases_topic_key").on(table.topicKey).where(sql`${table.kind} = 'topic'`),
    index("cases_created_by").on(table.createdBy),
  ],
);

export const plays = pgTable(
  "plays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    /** Null only for plays recorded before players existed. */
    playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }),
    actions: jsonb("actions").$type<GameAction[]>().notNull().default([]),
    status: text("status", { enum: ["in_progress", "solved", "failed"] }).notNull().default("in_progress"),
    score: integer("score").notNull(),
    livesLeft: integer("lives_left").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("plays_case_id").on(table.caseId),
    // One play per player per case: starting a case again resumes the same play.
    uniqueIndex("plays_player_case").on(table.playerId, table.caseId),
  ],
);

/** A "Challenge a friend" link: one per challenger and case. */
export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    challengerId: uuid("challenger_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("challenges_challenger_case").on(table.challengerId, table.caseId)],
);

/** Everyone who took a challenge from its link, the challenger included. */
export const challengeEntries = pgTable(
  "challenge_entries",
  {
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.challengeId, table.playerId] }), index("challenge_entries_player").on(table.playerId)],
);

export type PlayerRow = typeof players.$inferSelect;
export type CaseRow = typeof cases.$inferSelect;
export type NewCaseRow = typeof cases.$inferInsert;
export type PlayRow = typeof plays.$inferSelect;
export type ChallengeRow = typeof challenges.$inferSelect;
