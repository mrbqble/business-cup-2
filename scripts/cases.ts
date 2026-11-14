/**
 * Case content CLI.
 *
 *   npm run cases:generate -- --topic "..." [--angle "..."] [--kind daily --date YYYY-MM-DD | --kind archive | --kind topic] [--dry-run]
 *   npm run cases:seed [-- --from 2026-11-14 --to 2026-11-20]
 *   npm run cases:backfill [-- --only exhibits|narration] [--slug <slug>] [--force] [--dry-run]
 */
import { parseArgs } from "node:util";

import { curatedTopics } from "../content/topics";
import { estimateCostUsd, getNarrationAi } from "../src/lib/ai";
import { writeNarration } from "../src/lib/case/narrate";
import { publicCaseText } from "../src/lib/case/narration";
import { caseKinds, type CaseKind } from "../src/lib/case/schema";
import { draftCase, storeCase, type DraftedCase } from "../src/lib/case/service";
import { dailyCaseExists, listCases, updateCasePresentation } from "../src/lib/db/cases";
import { createExhibitClient } from "../src/lib/sources/exhibits";

const DEFAULT_SEED_FROM = "2026-11-14";
const DEFAULT_SEED_TO = "2026-11-20";

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "generate") return generateOne(rest);
  if (command === "seed") return seed(rest);
  if (command === "backfill") return backfill(rest);
  throw new Error('Usage: cases.ts generate|seed|backfill [options] (see the comment at the top of scripts/cases.ts)');
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

/** Adds exhibits (no model call) and narration (one cheap call per part) to stored cases that lack them. */
async function backfill(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      only: { type: "string" },
      slug: { type: "string", multiple: true },
      force: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (values.only && values.only !== "exhibits" && values.only !== "narration") throw new Error("--only must be exhibits or narration");
  const exhibitClient = createExhibitClient({
    onError: (source, error) => console.log(`  ! images for "${source.title}" failed: ${error instanceof Error ? error.message : String(error)}`),
  });
  let totalCost = 0;

  const records = (await listCases()).filter((r) => !values.slug || values.slug.includes(r.slug));
  for (const record of records) {
    const label = `${record.kind}${record.number ? ` #${record.number}` : ""} ${record.slug}`;
    const update: Parameters<typeof updateCasePresentation>[1] = {};

    if (values.only !== "narration" && (values.force || record.exhibits.length === 0)) {
      const exhibits = await exhibitClient.find(record.sources, publicCaseText(record.content));
      update.exhibits = exhibits;
      console.log(`${label}\n  exhibits: ${exhibits.length}${exhibits.map((e, i) => `\n    ${i === 0 ? "cover" : `  ${i + 1}  `} ${e.title} [${e.license}${e.credit ? `, ${e.credit}` : ""}]`).join("")}`);
    }
    if (values.only !== "exhibits" && (values.force || !record.narration)) {
      const result = await writeNarration(getNarrationAi(), record.content);
      const cost = estimateCostUsd(result.calls.map((c) => c.usage)) ?? 0;
      totalCost += cost;
      update.narration = result.narration;
      console.log(
        `${update.exhibits ? "" : `${label}\n`}  narration: ${result.fallbackParts.length ? `fallback for ${result.fallbackParts.join(", ")}` : "model"}${result.problems.length ? ` (${result.problems.join(" | ")})` : ""} | ${result.calls.length} call(s) | $${cost.toFixed(4)}\n    ${Object.entries(result.narration).map(([part, text]) => `${part}: ${text}`).join("\n    ")}`,
      );
    }
    if (!values["dry-run"]) await updateCasePresentation(record.id, update);
  }
  console.log(`${values["dry-run"] ? "dry run, nothing stored" : "stored"} | narration cost $${totalCost.toFixed(4)}`);
}

async function draft(topic: string, angle: string | undefined): Promise<DraftedCase> {
  const generated = await draftCase({ topic, angle, onEvent: (e) => console.log(`  ${e.stage}: ${e.message}`) });
  const g = generated.generation;
  console.log(
    `  verified: "${generated.content.title}" | sources ${generated.sources.map((s) => s.title).join(", ")} | repair rounds ${g.repairRounds} | ${g.providers.join(" > ")} (${g.models.join(", ")}) | ${(g.durationMs / 1000).toFixed(1)} s | ${g.costUsd === null ? "cost n/a" : `$${g.costUsd.toFixed(4)}`} | exhibits ${generated.exhibits.length}`,
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
