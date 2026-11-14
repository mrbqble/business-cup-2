import { z } from "zod";

import { USER_AGENT, WIKIPEDIA_API } from "./wikipedia";

export const MAX_EXHIBITS = 4;
/** Requested thumbnail width; Wikimedia serves the nearest standard size at or above it. */
export const THUMB_WIDTH = 800;
/** Name-filtered candidates per article sent to one imageinfo request (the API allows 50 titles). */
const MAX_CANDIDATES = 30;
const MIN_LONG_SIDE = 400;
const MAX_ASPECT_RATIO = 2.5;
const CREDIT_MAX_CHARS = 80;

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/tiff", "image/webp"]);
const IMAGE_FILE = /\.(jpe?g|png|tiff?|webp)$/i;
/** Interface art, heraldry and placeholders that articles pull in through templates. */
const UNWANTED_NAME =
  /\b(logo|icon|flags?|flagge|symbol|signature|coat of arms|emblem|seal|blank|placeholder|location map|locator|question book|ambox|padlock|portal|nuvola|stub|disambig|pictogram|ooui|oojs|wikisource|wiktionary|wikiquote|wikimedia|wikipedia|wikidata|wikibooks|wikinews|wikiversity|wikivoyage|skull and crossbones)\b/i;
const NON_FREE = /fair use|non-free|nonfree/i;
/** Words too common in file names to say anything about relevance. */
const GENERIC_WORDS = new Set([
  "file", "image", "photo", "photograph", "picture", "painting", "portrait", "drawing", "engraving", "view", "from", "with",
  "after", "before", "about", "into", "their", "the", "and", "des", "der", "die", "les", "del", "von", "jpeg", "crop", "cropped",
]);

export const exhibitSchema = z.object({
  /** Thumbnail on upload.wikimedia.org, about 800 px wide. */
  imageUrl: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** The file's description page on Wikimedia Commons: author, license and history. */
  pageUrl: z.string(),
  title: z.string(),
  /** Author as plain text; empty when the file page names none. */
  credit: z.string(),
  license: z.string(),
  licenseUrl: z.string().nullable(),
  sourceTitle: z.string(),
  sourceUrl: z.string(),
});

export type Exhibit = z.infer<typeof exhibitSchema>;

export interface ExhibitSource {
  title: string;
  url: string;
}

/** One file as the imageinfo API describes it. */
export interface ImageInfo {
  file: string;
  repository: string;
  mime: string;
  width: number;
  height: number;
  thumbUrl: string;
  thumbWidth: number;
  thumbHeight: number;
  pageUrl: string;
  license: string | null;
  licenseUrl: string | null;
  nonFree: boolean;
  artistHtml: string | null;
}

export interface ArticleImages {
  source: ExhibitSource;
  /** The article's lead image ("File:..."), if it has a free one. */
  lead: string | null;
  infos: ImageInfo[];
}

export type RejectReason = "not_commons" | "non_free" | "no_license" | "format" | "name" | "too_small" | "shape";

/** File names worth asking imageinfo about: real pictures, not template art. */
export function isCandidateFile(file: string): boolean {
  const name = displayTitle(file);
  return IMAGE_FILE.test(file) && !UNWANTED_NAME.test(name);
}

/** Why a file can't be an exhibit, or null when it can. Only free files hosted on Commons pass. */
export function rejectReason(info: ImageInfo): RejectReason | null {
  if (info.repository !== "shared") return "not_commons";
  if (info.nonFree || (info.license && NON_FREE.test(info.license))) return "non_free";
  if (!info.license?.trim()) return "no_license";
  if (!IMAGE_MIMES.has(info.mime)) return "format";
  if (UNWANTED_NAME.test(displayTitle(info.file))) return "name";
  if (Math.max(info.width, info.height) < MIN_LONG_SIDE) return "too_small";
  const ratio = Math.max(info.width, info.height) / Math.min(info.width, info.height);
  if (!Number.isFinite(ratio) || ratio > MAX_ASPECT_RATIO) return "shape";
  return null;
}

export function toExhibit(info: ImageInfo, source: ExhibitSource): Exhibit {
  return {
    imageUrl: info.thumbUrl,
    width: info.thumbWidth,
    height: info.thumbHeight,
    pageUrl: info.pageUrl,
    title: displayTitle(info.file),
    credit: plainText(info.artistHtml ?? "", CREDIT_MAX_CHARS),
    license: info.license?.trim() ?? "",
    licenseUrl: info.licenseUrl?.trim() || null,
    sourceTitle: source.title,
    sourceUrl: source.url,
  };
}

/**
 * Up to four exhibits. The primary article's lead image comes first and serves as the cover; the
 * rest are ranked by how many words they share with `publicText` (what the player sees at the
 * start), so the ranking never leans on sealed evidence.
 */
export function pickExhibits(articles: ArticleImages[], publicText: string): Exhibit[] {
  const context = significantWords(publicText);
  const seen = new Set<string>();
  const ranked: { exhibit: Exhibit; lead: boolean; primaryLead: boolean; relevance: number; jpeg: boolean; order: number }[] = [];

  articles.forEach((article, articleIndex) => {
    article.infos.forEach((info, order) => {
      if (seen.has(info.file) || rejectReason(info) !== null) return;
      seen.add(info.file);
      const lead = info.file === article.lead;
      ranked.push({
        exhibit: toExhibit(info, article.source),
        lead,
        primaryLead: lead && articleIndex === 0,
        relevance: [...significantWords(displayTitle(info.file))].filter((w) => context.has(w)).length,
        jpeg: info.mime === "image/jpeg",
        order: articleIndex * 1000 + order,
      });
    });
  });

  ranked.sort(
    (a, b) =>
      Number(b.primaryLead) - Number(a.primaryLead) ||
      Number(b.lead) - Number(a.lead) ||
      b.relevance - a.relevance ||
      Number(b.jpeg) - Number(a.jpeg) ||
      a.order - b.order,
  );
  return ranked.slice(0, MAX_EXHIBITS).map((r) => r.exhibit);
}

/** "File:Chateau_de_Malmaison.jpg" -> "Chateau de Malmaison". */
export function displayTitle(file: string): string {
  return file
    .replace(/^File:/i, "")
    .replace(/_/g, " ")
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .trim();
}

/** Strips tags and entities from extmetadata HTML and keeps the first line, shortened. */
export function plainText(html: string, maxChars: number): string {
  const text = decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " "))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .find((line) => line.length > 0)
    // Creator templates sometimes render the same name twice ("Unknown author Unknown author").
    ?.replace(/^(.+?) \1$/u, "$1");
  if (!text) return "";
  return text.length <= maxChars ? text : `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const point = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

/** Lowercase words of four or more letters, minus words that say nothing about a picture. */
export function significantWords(text: string): Set<string> {
  const words = text.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "").match(/\p{L}{4,}/gu) ?? [];
  return new Set(words.filter((w) => !GENERIC_WORDS.has(w)));
}

// ---- Thin API client ------------------------------------------------------------------------

export function imagesUrl(articleTitle: string): string {
  return apiUrl({ action: "query", prop: "pageimages|images", piprop: "name", imlimit: "max", titles: articleTitle, redirects: "1" });
}

export function imageInfoUrl(files: string[]): string {
  return apiUrl({
    action: "query",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|NonFree",
    titles: files.join("|"),
  });
}

function apiUrl(params: Record<string, string>): string {
  return `${WIKIPEDIA_API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
}

const imagesResponse = z.object({
  query: z
    .object({
      pages: z.array(
        z.object({
          title: z.string(),
          missing: z.boolean().optional(),
          pageimage: z.string().optional(),
          images: z.array(z.object({ title: z.string() })).optional(),
        }),
      ),
    })
    .optional(),
});

const metaValue = z.object({ value: z.unknown() }).optional();

const imageInfoResponse = z.object({
  query: z
    .object({
      pages: z.array(
        z.object({
          title: z.string(),
          imagerepository: z.string().optional(),
          imageinfo: z
            .array(
              z.object({
                url: z.string(),
                descriptionurl: z.string(),
                thumburl: z.string().optional(),
                thumbwidth: z.number().optional(),
                thumbheight: z.number().optional(),
                width: z.number(),
                height: z.number(),
                mime: z.string(),
                extmetadata: z
                  .object({ LicenseShortName: metaValue, LicenseUrl: metaValue, Artist: metaValue, NonFree: metaValue })
                  .optional(),
              }),
            )
            .optional(),
        }),
      ),
    })
    .optional(),
});

export interface ExhibitClient {
  find(sources: ExhibitSource[], publicText: string): Promise<Exhibit[]>;
}

export interface ExhibitClientOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Called for an article whose images could not be fetched; that article is skipped. */
  onError?: (source: ExhibitSource, error: unknown) => void;
}

export function createExhibitClient({ fetchImpl = fetch, timeoutMs = 8_000, onError }: ExhibitClientOptions = {}): ExhibitClient {
  async function get(url: string): Promise<unknown> {
    const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`Wikipedia API returned ${response.status}`);
    return response.json();
  }

  async function articleImages(source: ExhibitSource): Promise<ArticleImages> {
    const page = imagesResponse.parse(await get(imagesUrl(source.title))).query?.pages[0];
    if (!page || page.missing) return { source, lead: null, infos: [] };
    const lead = page.pageimage ? `File:${page.pageimage.replace(/_/g, " ")}` : null;
    const files = [...new Set([...(lead ? [lead] : []), ...(page.images ?? []).map((i) => i.title)])]
      .filter(isCandidateFile)
      .slice(0, MAX_CANDIDATES);
    if (files.length === 0) return { source, lead, infos: [] };

    const pages = imageInfoResponse.parse(await get(imageInfoUrl(files))).query?.pages ?? [];
    const byFile = new Map(pages.map((p) => [p.title, p]));
    const infos = files.flatMap((file): ImageInfo[] => {
      const p = byFile.get(file);
      const info = p?.imageinfo?.[0];
      if (!p || !info) return [];
      const meta = info.extmetadata;
      const text = (value: unknown) => (typeof value === "string" ? value : value == null ? null : String(value));
      const nonFree = text(meta?.NonFree?.value);
      return [
        {
          file,
          repository: p.imagerepository ?? "",
          mime: info.mime,
          width: info.width,
          height: info.height,
          thumbUrl: info.thumburl ?? info.url,
          thumbWidth: info.thumbwidth ?? info.width,
          thumbHeight: info.thumbheight ?? info.height,
          pageUrl: info.descriptionurl,
          license: text(meta?.LicenseShortName?.value),
          licenseUrl: text(meta?.LicenseUrl?.value),
          nonFree: nonFree !== null && nonFree !== "" && nonFree !== "false" && nonFree !== "0",
          artistHtml: text(meta?.Artist?.value),
        },
      ];
    });
    return { source, lead, infos };
  }

  return {
    async find(sources, publicText) {
      const articles = await Promise.all(
        sources.map((source) =>
          articleImages(source).catch((error: unknown) => {
            onError?.(source, error);
            return null;
          }),
        ),
      );
      return pickExhibits(
        articles.filter((a): a is ArticleImages => a !== null),
        publicText,
      );
    },
  };
}

let shared: ExhibitClient | undefined;

export function getExhibits(): ExhibitClient {
  shared ??= createExhibitClient();
  return shared;
}
