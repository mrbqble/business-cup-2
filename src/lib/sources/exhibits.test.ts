import { describe, expect, it, vi } from "vitest";

import antikytheraInfo from "./__fixtures__/imageinfo-antikythera.json";
import hundredDaysInfo from "./__fixtures__/imageinfo-hundred-days.json";
import antikytheraImages from "./__fixtures__/images-antikythera.json";
import hundredDaysImages from "./__fixtures__/images-hundred-days.json";
import {
  createExhibitClient,
  displayTitle,
  isCandidateFile,
  MAX_EXHIBITS,
  pickExhibits,
  plainText,
  rejectReason,
  type ImageInfo,
} from "./exhibits";

const HUNDRED_DAYS = { title: "Hundred Days", url: "https://en.wikipedia.org/wiki/Hundred_Days" };
const ANTIKYTHERA = { title: "Antikythera mechanism", url: "https://en.wikipedia.org/wiki/Antikythera_mechanism" };

/** Serves the recorded responses by article title (images list) or by first file (imageinfo). */
function recordedFetch(failTitles: string[] = []) {
  return vi.fn(async (input: string | URL | Request) => {
    const params = new URL(String(input)).searchParams;
    const titles = params.get("titles") ?? "";
    if (failTitles.includes(titles)) return new Response("busy", { status: 503 });
    const body =
      params.get("prop") === "pageimages|images"
        ? titles === HUNDRED_DAYS.title
          ? hundredDaysImages
          : antikytheraImages
        : titles.includes("Antikythera")
          ? antikytheraInfo
          : hundredDaysInfo;
    return Response.json(body);
  });
}

function info(overrides: Partial<ImageInfo>): ImageInfo {
  return {
    file: "File:Test painting.jpg",
    repository: "shared",
    mime: "image/jpeg",
    width: 1600,
    height: 1200,
    thumbUrl: "https://upload.wikimedia.org/x/800px-Test.jpg",
    thumbWidth: 800,
    thumbHeight: 600,
    pageUrl: "https://commons.wikimedia.org/wiki/File:Test_painting.jpg",
    license: "Public domain",
    licenseUrl: null,
    nonFree: false,
    artistHtml: "Someone",
    ...overrides,
  };
}

describe("isCandidateFile", () => {
  it("keeps photos, scans and paintings", () => {
    expect(isCandidateFile("File:Beaume - Napoléon Ier quittant l'île d'Elbe - 1836.jpg")).toBe(true);
    expect(isCandidateFile("File:Antikythera Fragment A (Front).webp")).toBe(true);
    expect(isCandidateFile("File:Congress of Vienna.PNG")).toBe(true);
  });

  it("drops vector art, flags, logos and interface icons", () => {
    expect(isCandidateFile("File:Waterloo Campaign map-alt3.svg")).toBe(false);
    expect(isCandidateFile("File:Flag of the Kingdom of Württemberg (1806 - 1816).png")).toBe(false);
    expect(isCandidateFile("File:Wikisource-logo.jpg")).toBe(false);
    expect(isCandidateFile("File:Question book-new.png")).toBe(false);
    expect(isCandidateFile("File:Great Seal of the United States.jpg")).toBe(false);
    expect(isCandidateFile("File:Signature of Napoleon.png")).toBe(false);
  });
});

describe("rejectReason", () => {
  it("accepts a free Commons photo", () => {
    expect(rejectReason(info({}))).toBeNull();
  });

  it("drops files not hosted on Commons, which is where local fair-use files live", () => {
    expect(rejectReason(info({ repository: "local", license: "Fair use", nonFree: true }))).toBe("not_commons");
  });

  it("drops anything marked non-free or without a license", () => {
    expect(rejectReason(info({ nonFree: true }))).toBe("non_free");
    expect(rejectReason(info({ license: "Non-free media" }))).toBe("non_free");
    expect(rejectReason(info({ license: null }))).toBe("no_license");
    expect(rejectReason(info({ license: "  " }))).toBe("no_license");
  });

  it("drops vector files, tiny images and banner shapes", () => {
    expect(rejectReason(info({ mime: "image/svg+xml" }))).toBe("format");
    expect(rejectReason(info({ width: 180, height: 207 }))).toBe("too_small");
    expect(rejectReason(info({ width: 4000, height: 1000 }))).toBe("shape");
  });
});

describe("pickExhibits from recorded Wikipedia responses", () => {
  it("makes the lead image the cover and keeps at most four free Commons files", async () => {
    const client = createExhibitClient({ fetchImpl: recordedFetch() });
    const exhibits = await client.find([HUNDRED_DAYS], "How did Napoleon retake France in 1815 after Elba?");

    expect(exhibits).toHaveLength(MAX_EXHIBITS);
    expect(exhibits[0].title).toBe("The battles of Napoleon's hundred days");
    for (const exhibit of exhibits) {
      expect(exhibit.license).not.toBe("");
      expect(exhibit.imageUrl).toMatch(/^https:\/\/(upload|thumb)\.wikimedia\.org\//);
      expect(exhibit.pageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(exhibit.credit).not.toMatch(/[<>]/);
      expect(exhibit.width).toBeGreaterThan(0);
      expect(exhibit.sourceTitle).toBe("Hundred Days");
    }
    expect(exhibits.map((e) => e.title).join(" ")).not.toMatch(/flag|logo/i);
  });

  it("skips fair-use and tiny files and ranks pictures by words the case shares with them", async () => {
    const client = createExhibitClient({ fetchImpl: recordedFetch() });
    const exhibits = await client.find([ANTIKYTHERA], "What was the Antikythera mechanism built to calculate?");
    const titles = exhibits.map((e) => e.title);

    expect(titles[0]).toBe("Antikythera Fragment A (Front)");
    expect(titles.every((t) => /antikythera/i.test(t))).toBe(true);
    expect(titles).not.toContain("Computer graphic for front of Antikythera mechanism");
    expect(titles).not.toContain("He1523a");
  });

  it("puts a second article's lead right after the cover", async () => {
    const client = createExhibitClient({ fetchImpl: recordedFetch() });
    const exhibits = await client.find([HUNDRED_DAYS, ANTIKYTHERA], "Napoleon");
    expect(exhibits[0].title).toBe("The battles of Napoleon's hundred days");
    expect(exhibits[1].title).toBe("Antikythera Fragment A (Front)");
  });

  it("skips an article whose images can't be fetched and reports it", async () => {
    const onError = vi.fn();
    const client = createExhibitClient({ fetchImpl: recordedFetch([HUNDRED_DAYS.title]), onError });
    const exhibits = await client.find([HUNDRED_DAYS, ANTIKYTHERA], "Antikythera");
    expect(onError).toHaveBeenCalledWith(HUNDRED_DAYS, expect.any(Error));
    expect(exhibits[0].sourceTitle).toBe("Antikythera mechanism");
  });

  it("returns no exhibits when nothing passes", () => {
    expect(pickExhibits([{ source: HUNDRED_DAYS, lead: null, infos: [info({ mime: "image/svg+xml" })] }], "")).toEqual([]);
  });
});

describe("text helpers", () => {
  it("turns file names into titles", () => {
    expect(displayTitle("File:Chateau_de_Malmaison.jpg")).toBe("Chateau de Malmaison");
  });

  it("reduces extmetadata HTML to a short plain credit", () => {
    expect(plainText('<bdi><a href="https://x">Joseph Beaume</a>\n</bdi>', 80)).toBe("Joseph Beaume");
    expect(plainText("<p>Unknown <br> Vector graphics: someone</p>", 80)).toBe("Unknown");
    expect(plainText("Fran&#231;ois &amp; Co", 80)).toBe("François & Co");
    expect(plainText("<span>Unknown author</span> <span>Unknown author</span>", 80)).toBe("Unknown author");
    expect(plainText("a".repeat(100), 10)).toBe(`${"a".repeat(9)}…`);
    expect(plainText("", 80)).toBe("");
  });
});
