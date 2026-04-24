import { UserFacingError } from "@/lib/errors";
import { durationLabelFromSeconds, fetchYouTubeTranscript } from "@/lib/transcript";
import { extractVideoId, normalizeYouTubeUrl } from "@/lib/youtube";
import type { SourceType, TranscriptStatus } from "@/lib/types";

export type IngestedSource = {
  sourceType: SourceType;
  sourceUrl: string;
  youtubeUrl: string;
  videoId: string;
  title: string;
  channelName: string;
  durationLabel: string;
  sourceText: string;
  transcriptStatus: TranscriptStatus;
  thumbnailUrl?: string;
};

export async function ingestSource(url: string, sourceType: SourceType): Promise<IngestedSource> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new UserFacingError("Paste a link to get started.", "invalid_url");
  }

  if (sourceType === "youtube") {
    return ingestYouTube(trimmed);
  }

  return ingestArticleSource(trimmed, sourceType);
}

async function ingestYouTube(url: string): Promise<IngestedSource> {
  const normalizedUrl = normalizeYouTubeUrl(url);
  const videoId = extractVideoId(url);

  if (!normalizedUrl || !videoId) {
    throw new UserFacingError("Please enter a valid YouTube URL.", "invalid_url");
  }

  const transcriptResult = await fetchYouTubeTranscript(normalizedUrl);
  const sourceText = transcriptResult.transcript.map((segment) => segment.text.trim()).filter(Boolean).join(" ");

  return {
    sourceType: "youtube",
    sourceUrl: normalizedUrl,
    youtubeUrl: normalizedUrl,
    videoId,
    title: transcriptResult.title,
    channelName: transcriptResult.channelName,
    durationLabel: durationLabelFromSeconds(transcriptResult.durationSeconds),
    sourceText,
    transcriptStatus: transcriptResult.transcript.length > 20 ? "ready" : "partial",
    thumbnailUrl: transcriptResult.thumbnailUrl ?? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
  };
}

async function ingestArticleSource(url: string, sourceType: Exclude<SourceType, "youtube">): Promise<IngestedSource> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UserFacingError(`Please enter a valid ${sourceTypeName(sourceType)} URL.`, "invalid_url");
  }

  const host = parsed.hostname.replace(/^www\./, "");
  if (sourceType === "medium" && !host.includes("medium.com")) {
    throw new UserFacingError("Please enter a valid Medium URL.", "invalid_url");
  }
  if (sourceType === "substack" && !host.includes("substack.com")) {
    throw new UserFacingError("Please enter a valid Substack URL.", "invalid_url");
  }

  const response = await fetch(parsed.toString(), {
    headers: {
      "User-Agent": "SignalTube/1.0 (+https://localhost)",
      Accept: "text/html,application/xhtml+xml"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    throw new UserFacingError(`We could not fetch this ${sourceTypeName(sourceType)} article.`, "source_fetch_failed");
  }

  const html = await response.text();
  const title = decodeEntities(extractMeta(html, "og:title") || extractTagText(html, "title") || parsed.pathname.split("/").filter(Boolean).at(-1) || sourceTypeName(sourceType));
  const channelName = decodeEntities(
    extractMeta(html, "og:site_name") ||
      extractMeta(html, "author") ||
      host.replace(/\.substack\.com$/, "").replace(/\.(com|org|io|co|net|ai)$/i, "")
  );
  const thumbnailUrl = extractMeta(html, "og:image");
  const sourceText = extractReadableText(html);

  if (sourceText.split(/\s+/).length < 80) {
    throw new UserFacingError(
      `We found the page, but could not extract enough readable text. Try a public ${sourceTypeName(sourceType)} article.`,
      "source_text_unavailable"
    );
  }

  return {
    sourceType,
    sourceUrl: parsed.toString(),
    youtubeUrl: "",
    videoId: "",
    title,
    channelName,
    durationLabel: "",
    sourceText,
    transcriptStatus: "ready",
    thumbnailUrl
  };
}

function extractReadableText(html: string) {
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  const main = articleMatch?.[0] ?? html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html;
  return decodeEntities(
    main
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function extractMeta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const property = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i");
  return html.match(property)?.[1] ?? html.match(contentFirst)?.[1] ?? "";
}

function extractTagText(html: string, tag: string) {
  return html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "";
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function sourceTypeName(sourceType: SourceType) {
  if (sourceType === "youtube") return "YouTube";
  if (sourceType === "medium") return "Medium";
  if (sourceType === "substack") return "Substack";
  return "blog article";
}
