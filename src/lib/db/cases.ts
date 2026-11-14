import "server-only";

import { and, desc, eq, lte, sql } from "drizzle-orm";

import type { CaseRecord } from "@/lib/case/schema";

import { getDb } from "./client";
import { cases, type CaseRow, type NewCaseRow } from "./schema";

export function toCaseRecord(row: CaseRow): CaseRecord {
  return {
    id: row.id,
    slug: row.slug,
    number: row.number,
    kind: row.kind,
    dateKey: row.dateKey,
    content: row.payload,
    sources: row.sources,
  };
}

export async function findCaseBySlug(slug: string): Promise<CaseRecord | null> {
  const [row] = await getDb().select().from(cases).where(eq(cases.slug, slug)).limit(1);
  return row ? toCaseRecord(row) : null;
}

export async function findCaseById(id: string): Promise<CaseRecord | null> {
  const [row] = await getDb().select().from(cases).where(eq(cases.id, id)).limit(1);
  return row ? toCaseRecord(row) : null;
}

export async function findTopicCase(topicKey: string): Promise<CaseRecord | null> {
  const [row] = await getDb()
    .select()
    .from(cases)
    .where(and(eq(cases.kind, "topic"), eq(cases.topicKey, topicKey)))
    .limit(1);
  return row ? toCaseRecord(row) : null;
}

/** Today's daily case, or the latest earlier one so the home page is never empty. */
export async function findDailyCase(dateKey: string): Promise<CaseRecord | null> {
  const [row] = await getDb()
    .select()
    .from(cases)
    .where(and(eq(cases.kind, "daily"), lte(cases.dateKey, dateKey)))
    .orderBy(desc(cases.dateKey))
    .limit(1);
  return row ? toCaseRecord(row) : null;
}

export async function countTopicCasesCreatedBy(playerId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(cases)
    .where(and(eq(cases.kind, "topic"), eq(cases.createdBy, playerId)));
  return row?.count ?? 0;
}

export async function dailyCaseExists(dateKey: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: cases.id })
    .from(cases)
    .where(and(eq(cases.kind, "daily"), eq(cases.dateKey, dateKey)))
    .limit(1);
  return Boolean(row);
}

/** Inserts a case; a daily case gets the next sequential number. */
export async function insertCase(values: Omit<NewCaseRow, "id" | "number" | "createdAt">): Promise<CaseRecord> {
  const number =
    values.kind === "daily"
      ? sql<number>`(select coalesce(max(${cases.number}), 0) + 1 from ${cases} where ${cases.kind} = 'daily')`
      : null;
  const [row] = await getDb()
    .insert(cases)
    .values({ ...values, number })
    .returning();
  return toCaseRecord(row);
}
