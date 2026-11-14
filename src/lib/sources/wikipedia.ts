import { z } from "zod";

const ENDPOINT = "https://en.wikipedia.org/w/api.php";
/** Wikimedia asks API clients to identify themselves with a way to reach the operator. */
export const USER_AGENT = "DailyCase/0.1 (https://github.com/mrbqble/business-cup-2)";

const NOISE_SECTIONS =
  /^(see also|references|notes|sources|citations|footnotes|further reading|external links|bibliography|gallery|works cited|explanatory notes)$/i;
const HEADING = /^(=+)\s*(.+?)\s*=+\s*$/;

export interface WikipediaArticle {
  title: string;
  url: string;
  revisionId: number;
  /** Plain text without reference sections; quotes are checked against exactly this text. */
  text: string;
}

export interface WikipediaClient {
  search(query: string, limit?: number): Promise<string[]>;
  article(title: string): Promise<WikipediaArticle | null>;
}

export interface WikipediaClientOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  cacheTtlMs?: number;
}

export class WikipediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WikipediaError";
  }
}

const searchResponse = z.object({
  query: z.object({ search: z.array(z.object({ title: z.string() })) }),
});

const articleResponse = z.object({
  query: z.object({
    pages: z.array(
      z.object({
        title: z.string(),
        missing: z.boolean().optional(),
        canonicalurl: z.string().optional(),
        extract: z.string().optional(),
        revisions: z.array(z.object({ revid: z.number() })).optional(),
      }),
    ),
  }),
});

export function createWikipediaClient({
  fetchImpl = fetch,
  timeoutMs = 8_000,
  cacheTtlMs = 6 * 60 * 60 * 1000,
}: WikipediaClientOptions = {}): WikipediaClient {
  const cache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

  /** Caches the promise, so concurrent identical requests share one network call; failures are not cached. */
  function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;
    const value = load().catch((error: unknown) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, { expiresAt: Date.now() + cacheTtlMs, value });
    return value;
  }

  async function get(params: Record<string, string>): Promise<unknown> {
    const url = `${ENDPOINT}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
    const response = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new WikipediaError(`Wikipedia API returned ${response.status}`);
    return response.json();
  }

  return {
    search(query, limit = 5) {
      return cached(`search:${limit}:${query}`, async () => {
        const data = searchResponse.parse(
          await get({ action: "query", list: "search", srsearch: query, srlimit: String(limit), srnamespace: "0", srprop: "" }),
        );
        return data.query.search.map((result) => result.title);
      });
    },

    article(title) {
      return cached(`article:${title}`, async () => {
        const data = articleResponse.parse(
          await get({
            action: "query",
            prop: "extracts|info|revisions",
            titles: title,
            explaintext: "1",
            exsectionformat: "wiki",
            inprop: "url",
            rvprop: "ids",
            redirects: "1",
          }),
        );
        const page = data.query.pages[0];
        const revisionId = page?.revisions?.[0]?.revid;
        if (!page || page.missing || !page.extract || !page.canonicalurl || revisionId === undefined) return null;
        return { title: page.title, url: page.canonicalurl, revisionId, text: cleanExtract(page.extract) };
      });
    },
  };
}

let shared: WikipediaClient | undefined;

/** One client per process, so its cache is shared by every request the instance serves. */
export function getWikipedia(): WikipediaClient {
  shared ??= createWikipediaClient();
  return shared;
}

/** Drops reference-style sections and turns `== Heading ==` lines into plain heading lines. */
export function cleanExtract(extract: string): string {
  const kept: string[] = [];
  let skipBelowLevel: number | null = null;

  for (const line of extract.split("\n")) {
    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (skipBelowLevel !== null && level > skipBelowLevel) continue;
      skipBelowLevel = NOISE_SECTIONS.test(heading[2]) ? level : null;
      if (skipBelowLevel === null) kept.push(heading[2]);
      continue;
    }
    if (skipBelowLevel === null) kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
