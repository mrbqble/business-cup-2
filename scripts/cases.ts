/**
 * Case content CLI.
 *
 *   npm run cases:generate -- --topic "..." [--angle "..."] [--kind daily --date YYYY-MM-DD | --kind archive | --kind topic] [--dry-run]
 *   npm run cases:seed [-- --from 2026-11-14 --to 2026-11-20]
 */
import { parseArgs } from "node:util";

import { curatedTopics } from "../content/topics";
import { caseKinds, type CaseKind } from "../src/lib/case/schema";
import { draftCase, storeCase } from "../src/lib/case/service";
import type { GeneratedCase } from "../src/lib/case/generate";
import { dailyCaseExists } from "../src/lib/db/cases";

const DEFAULT_SEED_FROM = "2026-11-14";
const DEFAULT_SEED_TO = "2026-11-20";

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "generate") return generateOne(rest);
  if (command === "seed") return seed(rest);
  throw new Error('Usage: cases.ts generate|seed [options] (see the comment at the top of scripts/cases.ts)');
}

async function generateOne(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      topic: { type: "string" },
      angle: { type: "string" },
      kind: { type: "string", default: "archive" },
      date: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (!values.topic) throw new Error("--topic is required");
  const kind = parseKind(values.kind);
  if (kind === "daily" && !values.date) throw new Error("--date is required for a daily case");

  const generated = await draft(values.topic, values.angle);
  if (values["dry-run"]) {
    console.log(JSON.stringify(generated.content, null, 2));
    return;
  }
  const record = await storeCase(generated, { topic: values.topic, angle: values.angle, kind, dateKey: values.date });
  console.log(`stored ${record.kind} case ${record.slug}${record.number ? ` (#${record.number})` : ""}`);
}

async function seed(args: string[]) {
  const { values } = parseArgs({
    args,
    options: { from: { type: "string", default: DEFAULT_SEED_FROM }, to: { type: "string", default: DEFAULT_SEED_TO } },
  });
  const queue = [...curatedTopics];

  for (const dateKey of dateRange(values.from, values.to)) {
    if (await dailyCaseExists(dateKey)) {
      console.log(`${dateKey}: already has a case, skipped`);
      continue;
    }
    let stored = false;
    while (!stored && queue.length > 0) {
      const topic = queue.shift()!;
      try {
        const generated = await draft(topic.query, topic.angle);
        const record = await storeCase(generated, { topic: topic.query, angle: topic.angle, kind: "daily", dateKey });
        console.log(`${dateKey}: stored #${record.number} ${record.slug}`);
        stored = true;
      } catch (error) {
        console.log(`${dateKey}: "${topic.query}" failed (${error instanceof Error ? error.message : String(error)}), trying the next topic`);
      }
    }
    if (!stored) throw new Error(`Ran out of curated topics at ${dateKey}`);
  }
}

async function draft(topic: string, angle: string | undefined): Promise<GeneratedCase> {
  const generated = await draftCase({ topic, angle, onEvent: (e) => console.log(`  ${e.stage}: ${e.message}`) });
  const g = generated.generation;
  console.log(
    `  verified: "${generated.content.title}" | sources ${generated.sources.map((s) => s.title).join(", ")} | repair rounds ${g.repairRounds} | ${g.providers.join(" > ")} (${g.models.join(", ")}) | ${(g.durationMs / 1000).toFixed(1)} s | ${g.costUsd === null ? "cost n/a" : `$${g.costUsd.toFixed(4)}`}`,
  );
  return generated;
}

function parseKind(value: string | undefined): CaseKind {
  if (!caseKinds.includes(value as CaseKind)) throw new Error(`--kind must be one of ${caseKinds.join(", ")}`);
  return value as CaseKind;
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let day = new Date(`${from}T00:00:00Z`); day <= new Date(`${to}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
