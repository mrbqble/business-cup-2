const SINGLE_QUOTES = /[‘’‚‛′`´]/g;
const DOUBLE_QUOTES = /[“”„‟″«»]/g;
const DASHES = /[‐‑‒–—―−]/g;
const WRAPPING_QUOTES = /^["']+|["']+$/g;

/** Folds the differences a faithful copy may still have: case, whitespace, quote marks, dashes. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/­/g, "")
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** A quote with an ellipsis has text left out, so it is not a verbatim quote. */
export function hasEllipsis(quote: string): boolean {
  return /…|\.\s*\.\s*\./.test(quote);
}

export function normalizeQuote(quote: string): string {
  return normalizeText(quote).replace(WRAPPING_QUOTES, "").trim();
}

export function quoteAppearsIn(quote: string, sourceText: string): boolean {
  const needle = normalizeQuote(quote);
  return needle.length > 0 && normalizeText(sourceText).includes(needle);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}
