export const MIN_TOPIC_LENGTH = 3;
export const MAX_TOPIC_LENGTH = 120;

/** Cache key for a topic: case, punctuation and spacing do not make a new case. */
export function normalizeTopic(topic: string): string {
  return topic
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Keys a cached topic may be stored under: "Rosetta Stone" finds the case opened as "The Rosetta Stone". */
export function topicLookupKeys(topic: string): string[] {
  const key = normalizeTopic(topic);
  const bare = key.replace(/^(the|a|an) /, "");
  return [...new Set([key, bare, `the ${bare}`])];
}

/** URL-safe slug from a title plus a short random suffix. */
export function slugify(title: string, random: () => number = Math.random): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const short = base.length <= 60 ? base : base.slice(0, 61).replace(/-[^-]*$/, "");
  const suffix = Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, "0");
  return `${short || "case"}-${suffix}`;
}
