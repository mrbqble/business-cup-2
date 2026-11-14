import "server-only";

import { and, asc, desc, eq, lte, sql } from "drizzle-orm";

import type { Narration } from "@/lib/case/narration";
import type { CaseRecord } from "@/lib/case/schema";
import type { Exhibit } from "@/lib/sources/exhibits";

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
    exhibits: row.exhibits,
    narration: row.narration,
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

/** Every stored case, oldest first; for backfills. */
export async function listCases(): Promise<CaseRecord[]> {
  const rows = await getDb().select().from(cases).orderBy(asc(cases.createdAt));
  return rows.map(toCaseRecord);
}

/** Sets a case's exhibits and/or narration; the verified content itself never changes. */
export async function updateCasePresentation(id: string, values: { exhibits?: Exhibit[]; narration?: Narration }): Promise<void> {
  if (values.exhibits === undefined && values.narration === undefined) return;
  await getDb().update(cases).set(values).where(eq(cases.id, id));
}

/** Past daily cases (before today's) and archive cases, newest first. */
export async function listArchiveCases(todaysCaseDateKey: string | null): Promise<CaseRecord[]> {
  const pastDaily = todaysCaseDateKey
    ? and(eq(cases.kind, "daily"), sql`${cases.dateKey} < ${todaysCaseDateKey}`)
    : eq(cases.kind, "daily");
  const rows = await getDb()
    .select()
    .from(cases)
    .where(sql`(${pastDaily}) or ${cases.kind} = 'archive'`)
    .orderBy(desc(cases.dateKey), desc(cases.createdAt));
  return rows.map(toCaseRecord);
}

/** Brand-new topic cases created on a New York calendar day; the daily generation cap counts these. */
export async function countTopicCasesCreatedOn(dateKey: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(cases)
    .where(and(eq(cases.kind, "topic"), sql`(${cases.createdAt} at time zone 'America/New_York')::date = ${dateKey}::date`));
  return row?.count ?? 0;
}

/** Topic cases someone already opened: free and instant for everyone. */
export async function recentTopicCases(limit = 6): Promise<{ slug: string; title: string }[]> {
  return getDb()
    .select({ slug: cases.slug, title: cases.title })
    .from(cases)
    .where(eq(cases.kind, "topic"))
    .orderBy(desc(cases.createdAt))
    .limit(limit);
}
