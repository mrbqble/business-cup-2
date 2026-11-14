import { describe, expect, it } from "vitest";

import { sampleCase, sampleSource } from "./__fixtures__/sample-case";
import type { CaseContent } from "./schema";
import { verifyCase, type VerificationFailure } from "./verify";

function checks(content: CaseContent, sources = [sampleSource]): Pick<VerificationFailure, "check" | "target">[] {
  return verifyCase(content, sources).failures.map(({ check, target }) => ({ check, target }));
}

function edit(change: (draft: CaseContent) => void): CaseContent {
  const draft = sampleCase();
  change(draft);
  return draft;
}

describe("verifyCase", () => {
  it("accepts a well-formed case and reports every quote as found", () => {
    const report = verifyCase(sampleCase(), [sampleSource]);

    expect(report.failures).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.quotes).toHaveLength(8);
    expect(report.quotes.every((q) => q.found)).toBe(true);
  });

  it("accepts a quote that differs from the source only in case, spacing and punctuation style", () => {
    const content = edit((d) => {
      d.clues[3].quote = "  a WORKHOUSE with its own water supply reported almost no deaths among its 500 inmates. ";
    });
    expect(checks(content)).toEqual([]);
  });

  it("fails a quote that is not in its source, naming the clue", () => {
    const content = edit((d) => {
      d.clues[4].quote = "A widow in Hampstead loved the Broad Street water and died.";
    });
    expect(checks(content)).toEqual([{ check: "quote_in_source", target: { type: "clue", id: "c5" } }]);
  });

  it("fails a quote with an ellipsis even when its pieces appear in the source", () => {
    const content = edit((d) => {
      d.clues[5].quote = "After the parish removed the handle of the pump ... new cases fell sharply.";
    });
    expect(checks(content)).toContainEqual({ check: "quote_ellipsis", target: { type: "clue", id: "c6" } });
  });

  it("fails a quote longer than 40 words and a headline longer than 8", () => {
    const longQuote = `${sampleSource.text.split("\n").slice(1, 5).join(" ")}`;
    const content = edit((d) => {
      d.clues[2].quote = longQuote;
      d.clues[2].headline = "One two three four five six seven eight nine";
    });
    expect(checks(content)).toEqual(
      expect.arrayContaining([
        { check: "quote_length", target: { type: "clue", id: "c3" } },
        { check: "headline_length", target: { type: "clue", id: "c3" } },
      ]),
    );
  });

  it("fails a clue pointing at an unknown source or hypothesis", () => {
    const content = edit((d) => {
      d.clues[6].sourceId = "S9";
      d.clues[7].supports = ["h9"];
    });
    expect(checks(content)).toEqual([
      { check: "clue_source", target: { type: "clue", id: "c7" } },
      { check: "clue_refs", target: { type: "clue", id: "c8" } },
    ]);
  });

  it("fails a clue that both supports and refutes the same hypothesis", () => {
    const content = edit((d) => {
      d.clues[7].refutes = ["h1"];
    });
    expect(checks(content)).toEqual(
      expect.arrayContaining([
        { check: "clue_refs", target: { type: "clue", id: "c8" } },
        { check: "correct_not_refuted", target: { type: "hypothesis", id: "h1" } },
      ]),
    );
  });

  it("fails wrong counts of clues, hypotheses, correct answers, solution sentences and learned points", () => {
    const content = edit((d) => {
      d.clues.pop();
      d.hypotheses[1].correct = true;
      d.solution = d.solution.slice(0, 2);
      d.learned.pop();
    });
    expect(checks(content).map((f) => f.check)).toEqual(
      expect.arrayContaining(["clue_count", "correct_count", "solution_length", "learned_count"]),
    );
  });

  it("fails repeated ids", () => {
    const content = edit((d) => {
      d.clues[1].id = "c1";
      d.hypotheses[3].id = "h3";
    });
    expect(checks(content)).toEqual(
      expect.arrayContaining([
        { check: "clue_ids_unique", target: { type: "clue", id: "c1" } },
        { check: "hypothesis_ids_unique", target: { type: "hypothesis", id: "h3" } },
      ]),
    );
  });

  it("fails a decoy that no clue refutes, naming the hypothesis", () => {
    const content = edit((d) => {
      d.clues[6].refutes = [];
    });
    expect(checks(content)).toEqual([{ check: "decoy_refuted", target: { type: "hypothesis", id: "h4" } }]);
  });

  it("fails an answer supported by fewer than 2 clues", () => {
    const content = edit((d) => {
      for (const clue of d.clues.slice(1)) clue.supports = [];
    });
    expect(checks(content)).toEqual([{ check: "correct_supported", target: { type: "hypothesis", id: "h1" } }]);
  });

  it("fails opening clues that already rule out every decoy", () => {
    const content = edit((d) => {
      d.clues[0].refutes = ["h2", "h3"];
      d.clues[1].refutes = ["h4"];
    });
    expect(checks(content)).toEqual([{ check: "opening_not_decisive", target: { type: "case" } }]);
  });

  it("fails a title that is not a question and a solution sentence citing no clue", () => {
    const content = edit((d) => {
      d.title = "The Broad Street pump";
      d.solution[1].clueIds = [];
    });
    expect(checks(content).map((f) => f.check)).toEqual(["title_question", "solution_refs"]);
  });
});
