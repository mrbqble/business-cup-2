import { describe, expect, it } from "vitest";

import { replay, rulesFor, type GameAction } from "@/lib/game/engine";

import type { Exhibit } from "@/lib/sources/exhibits";

import { sampleCase, sampleSource } from "./__fixtures__/sample-case";
import { fallbackNarration } from "./narration";
import type { CaseRecord } from "./schema";
import { buildPlayView } from "./view";

const exhibit: Exhibit = {
  imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/x/800px-Snow-cholera-map.jpg",
  width: 800,
  height: 760,
  pageUrl: "https://commons.wikimedia.org/wiki/File:Snow-cholera-map.jpg",
  title: "Snow cholera map",
  credit: "John Snow",
  license: "Public domain",
  licenseUrl: null,
  sourceTitle: sampleSource.title,
  sourceUrl: sampleSource.url,
};
const CLOSING = "The leaking cesspit beside the Broad Street well was the culprit all along.";

const record: CaseRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "broad-street",
  number: 2,
  kind: "daily",
  dateKey: "2026-11-15",
  content: sampleCase(),
  sources: [{ id: sampleSource.id, title: sampleSource.title, url: sampleSource.url, revisionId: sampleSource.revisionId }],
  exhibits: [exhibit],
  narration: { setting: "London, 1854.", mystery: "Cholera grips Soho.", task: "Find the source, Detective.", closing: CLOSING },
};

function viewAfter(...actions: GameAction[]) {
  return viewOf(record, ...actions);
}

function viewOf(caseRecord: CaseRecord, ...actions: GameAction[]) {
  const result = replay(rulesFor(caseRecord.content), actions);
  if (!result.ok) throw new Error(result.error);
  return buildPlayView(caseRecord, result.state);
}

describe("buildPlayView", () => {
  it("shows the opening clues in full with their source and seals the rest", () => {
    const view = viewAfter();

    expect(view.clues.filter((c) => !c.sealed).map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(view.clues[0]).toMatchObject({ quote: record.content.clues[0].quote, source: { title: sampleSource.title, url: sampleSource.url } });
    expect(view.clues[5]).toEqual({ id: "c6", kind: "record", sealed: true });
    expect(view.result).toBeNull();
  });

  it.each([
    ["at the start", []],
    ["after opening a clue", [{ type: "open", clueId: "c3" }]],
    ["after a wrong accusation", [{ type: "accuse", hypothesisId: "h3" }]],
  ] as [string, GameAction[]][])("leaks no answer data while the play is in progress (%s)", (_, actions) => {
    const view = viewAfter(...actions);
    const json = JSON.stringify(view);
    const visible = new Set(view.clues.filter((c) => !c.sealed).map((c) => c.id));

    expect(view.status).toBe("in_progress");
    for (const key of ["correct", "supports", "refutes", "solution", "learned", "correctHypothesisId"]) {
      expect(json).not.toContain(`"${key}"`);
    }
    for (const clue of record.content.clues.filter((c) => !visible.has(c.id))) {
      expect(json).not.toContain(clue.quote);
      expect(json).not.toContain(clue.body);
      expect(json).not.toContain(clue.headline);
    }
    expect(view.hypotheses.some((h) => h.status === "correct")).toBe(false);
    expect(view.narration.closing).toBeNull();
    expect(json).not.toContain(CLOSING);
  });

  it("shows the intro narration and the exhibits with credits from the start, and the closing only at the end", () => {
    const start = viewAfter();
    expect(start.narration).toEqual({ setting: "London, 1854.", mystery: "Cholera grips Soho.", task: "Find the source, Detective.", closing: null });
    expect(start.exhibits).toEqual([exhibit]);
    expect(start.case.cover).toEqual(exhibit);

    const solved = viewAfter({ type: "accuse", hypothesisId: "h1" });
    expect(solved.narration.closing).toBe(CLOSING);
  });

  it("falls back to the case's own words for a case without narration or exhibits", () => {
    const bare: CaseRecord = { ...record, exhibits: [], narration: null };
    const start = viewOf(bare);
    expect(start.narration.mystery).toBe(bare.content.title);
    expect(start.narration.closing).toBeNull();
    expect(start.case.cover).toBeNull();
    expect(viewOf(bare, { type: "accuse", hypothesisId: "h1" }).narration.closing).toBe(fallbackNarration(bare.content).closing);
  });

  it("marks a wrong accusation as ruled out and points at the clue that refutes it", () => {
    const view = viewAfter({ type: "accuse", hypothesisId: "h3" });

    expect(view.hypotheses.find((h) => h.id === "h3")).toEqual(expect.objectContaining({ status: "ruled_out", refutedByClueId: "c5" }));
    expect(view.clues.find((c) => c.id === "c5")?.sealed).toBe(false);
    expect(view.livesLeft).toBe(2);
  });

  it("reveals the answer, every clue, the solution and the sources once the play ends", () => {
    const view = viewAfter({ type: "accuse", hypothesisId: "h1" });

    expect(view.status).toBe("solved");
    expect(view.clues.every((c) => !c.sealed)).toBe(true);
    expect(view.hypotheses.find((h) => h.id === "h1")?.status).toBe("correct");
    expect(view.result).toEqual({
      grid: "⬛⬛⬛⬛⬛⬛ ✅",
      correctHypothesisId: "h1",
      solution: record.content.solution,
      sources: [{ title: sampleSource.title, url: sampleSource.url, revisionId: sampleSource.revisionId }],
      learned: record.content.learned,
    });
  });
});
