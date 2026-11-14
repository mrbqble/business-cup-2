import type { CaseKind } from "./schema";

/** "Daily Case #12", "Archive case" or "Case on request". */
export function caseLabel(summary: { kind: CaseKind; number: number | null }): string {
  if (summary.kind === "daily" && summary.number) return `Daily Case #${summary.number}`;
  return summary.kind === "archive" ? "Archive case" : "Case on request";
}
