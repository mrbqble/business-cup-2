import { describe, expect, it } from "vitest";

import { countWords, hasEllipsis, normalizeText, quoteAppearsIn } from "./quote";

describe("normalizeText", () => {
  it("folds case, whitespace, curly quotes, dashes, soft hyphens and non-breaking spaces", () => {
    expect(normalizeText("  The “Emperor”’s return — 1815­\n ")).toBe(
      "the \"emperor\"'s return - 1815",
    );
  });
});

describe("hasEllipsis", () => {
  it.each(["He went… home", "He went ... home", "He went . . . home"])("flags %j", (quote) => {
    expect(hasEllipsis(quote)).toBe(true);
  });

  it("allows ordinary sentence punctuation", () => {
    expect(hasEllipsis("He went home. Then he slept.")).toBe(false);
  });
});

describe("quoteAppearsIn", () => {
  const source = "Napoleon landed at Golfe-Juan on 1 March 1815.\nHe marched north  to Paris.";

  it("finds a quote that differs only in case, spacing, quote marks or dashes", () => {
    expect(quoteAppearsIn("napoleon landed at golfe–juan on 1 march 1815.", source)).toBe(true);
    expect(quoteAppearsIn("1815. He marched north to Paris.", source)).toBe(true);
  });

  it("ignores quote marks wrapped around the whole quote", () => {
    expect(quoteAppearsIn("“He marched north to Paris.”", source)).toBe(true);
  });

  it("rejects paraphrases and empty quotes", () => {
    expect(quoteAppearsIn("Napoleon arrived at Golfe-Juan in March 1815.", source)).toBe(false);
    expect(quoteAppearsIn("  ", source)).toBe(false);
  });
});

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("  one two\nthree ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});
