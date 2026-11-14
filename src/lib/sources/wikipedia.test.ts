import { describe, expect, it, vi } from "vitest";

import articleFixture from "./__fixtures__/article-broad-street.json";
import missingFixture from "./__fixtures__/article-missing.json";
import searchFixture from "./__fixtures__/search-john-snow.json";
import { cleanExtract, createWikipediaClient, USER_AGENT, WikipediaError } from "./wikipedia";

function fakeFetch(...bodies: unknown[]) {
  const responses = bodies.map((body) =>
    body instanceof Response ? body : new Response(JSON.stringify(body), { status: 200 }),
  );
  return vi.fn<typeof fetch>(async () => responses.shift() ?? new Response("{}", { status: 500 }));
}

describe("Wikipedia client", () => {
  it("returns search result titles and identifies itself with the project User-Agent", async () => {
    const fetchImpl = fakeFetch(searchFixture);
    const client = createWikipediaClient({ fetchImpl });

    await expect(client.search("John Snow cholera pump", 3)).resolves.toEqual([
      "John Snow",
      "1854 Broad Street cholera outbreak",
      "John Snow (public house)",
    ]);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain("list=search");
    expect(String(url)).toContain("srsearch=John+Snow+cholera+pump");
    expect(init?.headers).toEqual({ "User-Agent": USER_AGENT });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns an article's canonical URL, revision id and text without reference sections", async () => {
    const client = createWikipediaClient({ fetchImpl: fakeFetch(articleFixture) });

    const article = await client.article("1854 Broad Street cholera outbreak");

    expect(article).toMatchObject({
      title: "1854 Broad Street cholera outbreak",
      url: "https://en.wikipedia.org/wiki/1854_Broad_Street_cholera_outbreak",
      revisionId: 1385353611,
    });
    expect(article?.text).toMatch(/^A severe outbreak of cholera occurred in 1854/);
    expect(article?.text).toContain("\nCompeting theories of cholera\n");
    for (const section of ["Gallery", "See also", "References", "Further reading", "=="]) {
      expect(article?.text).not.toContain(section);
    }
  });

  it("returns null for a missing article", async () => {
    const client = createWikipediaClient({ fetchImpl: fakeFetch(missingFixture) });
    await expect(client.article("Nonexistent mystery")).resolves.toBeNull();
  });

  it("serves repeated requests from its cache", async () => {
    const fetchImpl = fakeFetch(searchFixture);
    const client = createWikipediaClient({ fetchImpl });

    await client.search("John Snow cholera pump", 3);
    await client.search("John Snow cholera pump", 3);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws on an HTTP error and does not cache the failure", async () => {
    const fetchImpl = fakeFetch(new Response("busy", { status: 503 }), searchFixture);
    const client = createWikipediaClient({ fetchImpl });

    await expect(client.search("John Snow cholera pump", 3)).rejects.toBeInstanceOf(WikipediaError);
    await expect(client.search("John Snow cholera pump", 3)).resolves.toHaveLength(3);
  });

  it("rejects a response that does not have the expected shape", async () => {
    const client = createWikipediaClient({ fetchImpl: fakeFetch({ error: { code: "badvalue" } }) });
    await expect(client.search("x")).rejects.toThrow();
  });
});

describe("cleanExtract", () => {
  it("keeps subsections of kept sections and drops subsections of dropped ones", () => {
    const extract = ["Intro.", "== History ==", "Old.", "=== Early ===", "Earlier.", "== Notes ==", "=== Detail ===", "Note.", "== Legacy ==", "Still here."].join("\n");
    expect(cleanExtract(extract)).toBe(["Intro.", "History", "Old.", "Early", "Earlier.", "Legacy", "Still here."].join("\n"));
  });
});
