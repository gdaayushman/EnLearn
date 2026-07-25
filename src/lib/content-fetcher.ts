/**
 * Auto-populate batch content by searching YouTube for relevant educational videos.
 * Uses YouTube Data API v3 (official, free, 10,000 quota units/day = ~100 searches).
 * Get a key: https://console.cloud.google.com → enable "YouTube Data API v3" → create API key
 * Set it as YOUTUBE_API_KEY env var (in Vercel + GitHub secrets).
 */

const YT_SEARCH = "https://www.googleapis.com/youtube/v3/search";

export type FetchedVideo = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  embedUrl: string;
  thumbnailUrl: string;
  publishedAt: string;
};

/** Detect what exam / class a batch targets from its name and sub-category. */
export function guessBatchContext(batchName: string, subCategoryName: string, categoryName: string) {
  const text = `${batchName} ${subCategoryName} ${categoryName}`.toLowerCase();
  const exam =
    text.includes("neet")  ? "NEET"  :
    text.includes("jee")   ? "JEE"   :
    text.includes("upsc")  ? "UPSC"  :
    text.includes("ssc")   ? "SSC"   :
    text.includes("board") ? "CBSE Boards" :
    text.includes("cuet")  ? "CUET"  :
    "";
  const cls =
    text.match(/class\s*1?(\d{1,2})/)?.[1] ??
    (text.includes("dropper") ? "12" : "");
  const isRevision = /revision|one\s*shot|crash|sprint/.test(text);
  const isPYQ = /pyq|previous year/.test(text);
  return { exam, cls, isRevision, isPYQ };
}

export function subjectsFor(exam: string): string[] {
  switch (exam) {
    case "NEET":        return ["Physics", "Chemistry", "Biology"];
    case "JEE":         return ["Physics", "Chemistry", "Mathematics"];
    case "UPSC":        return ["History", "Polity", "Geography", "Economy"];
    case "SSC":         return ["Reasoning", "Quantitative Aptitude", "General Awareness", "English"];
    case "CUET":        return ["English", "General Test", "Domain Subject"];
    case "CBSE Boards": return ["Physics", "Chemistry", "Mathematics", "Biology"];
    default:            return ["Physics", "Chemistry", "Mathematics", "Biology"];
  }
}

export function buildQuery(opts: { subject: string; exam: string; cls: string; isRevision: boolean; isPYQ: boolean; }) {
  const parts = [opts.subject];
  if (opts.cls) parts.push(`class ${opts.cls}`);
  if (opts.exam) parts.push(opts.exam);
  if (opts.isRevision) parts.push("revision one shot");
  if (opts.isPYQ) parts.push("previous year questions");
  parts.push("full chapter");
  return parts.join(" ");
}

export async function searchYouTube(query: string, maxResults = 3): Promise<FetchedVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY env var is not set");

  const url = new URL(YT_SEARCH);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("relevanceLanguage", "en");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.items ?? []).map((item: any): FetchedVideo => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description ?? "",
    channelTitle: item.snippet.channelTitle,
    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? "",
    publishedAt: item.snippet.publishedAt,
  }));
}

export async function fetchVideosForBatch(opts: {
  batchName: string;
  subCategoryName: string;
  categoryName: string;
  videosPerSubject?: number;
}): Promise<Array<FetchedVideo & { subject: string; queryUsed: string }>> {
  const ctx = guessBatchContext(opts.batchName, opts.subCategoryName, opts.categoryName);
  const subjects = subjectsFor(ctx.exam);
  const perSubject = opts.videosPerSubject ?? 3;

  const results: Array<FetchedVideo & { subject: string; queryUsed: string }> = [];
  for (const subject of subjects) {
    const q = buildQuery({ subject, exam: ctx.exam, cls: ctx.cls, isRevision: ctx.isRevision, isPYQ: ctx.isPYQ });
    try {
      const videos = await searchYouTube(q, perSubject);
      for (const v of videos) results.push({ ...v, subject, queryUsed: q });
    } catch (e) {
      console.error(`YouTube search failed for "${q}":`, e);
    }
  }
  return results;
}

export function suggestPdfLinks(subject: string, cls: string): Array<{ title: string; url: string }> {
  if (!cls) return [];
  const base = "https://ncert.nic.in/textbook.php";
  const subjMap: Record<string, string> = {
    Physics:     `${base}?keph1=0-8`,
    Chemistry:   `${base}?kech1=0-9`,
    Biology:     `${base}?kebo1=0-10`,
    Mathematics: `${base}?kemh1=0-8`,
  };
  return Object.entries(subjMap)
    .filter(([s]) => !subject || s === subject)
    .map(([s, url]) => ({ title: `NCERT — Class ${cls} ${s} (Official)`, url }));
}
