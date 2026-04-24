import { fetchTranscript } from "youtube-transcript-plus";

import { UserFacingError } from "@/lib/errors";
import { decodeHtmlEntities } from "@/lib/presentation";
import { formatDuration } from "@/lib/utils";
import { extractVideoId, normalizeYouTubeUrl } from "@/lib/youtube";
import type { FetchTranscriptResult, TranscriptSegment } from "@/lib/types";

type TranscriptResponse =
  | TranscriptSegment[]
  | {
      segments: TranscriptSegment[];
    };

export async function fetchYouTubeTranscript(url: string): Promise<FetchTranscriptResult> {
  const videoId = extractVideoId(url);
  const normalizedUrl = normalizeYouTubeUrl(url);

  if (!videoId || !normalizedUrl) {
    throw new UserFacingError("Please enter a valid YouTube URL.", "invalid_url");
  }

  try {
    const response = (await fetchTranscript(normalizedUrl, {
      lang: "en"
    })) as TranscriptResponse;

    const segments = Array.isArray(response) ? response : response.segments;
    const metadata = await fetchOEmbedMetadata(normalizedUrl);

    if (!segments || segments.length === 0) {
      throw new UserFacingError(
        "This video does not appear to have a transcript we can use yet.",
        "transcript_unavailable"
      );
    }

    const cleanedSegments = segments
      .map((segment) => ({
        text: decodeHtmlEntities(segment.text).replace(/\s+/g, " ").trim(),
        offset: Number(segment.offset ?? 0),
        duration: Number(segment.duration ?? 0)
      }))
      .filter((segment) => segment.text.length > 0);

    return {
      title: metadata.title || `YouTube Video ${videoId}`,
      channelName: metadata.channelName || "YouTube",
      durationSeconds: 0,
      transcript: cleanedSegments,
      thumbnailUrl: metadata.thumbnailUrl || buildYouTubeThumbnailUrl(videoId)
    };
  } catch (error) {
    if (error instanceof UserFacingError) {
      throw error;
    }

    throw new UserFacingError(
      "We could not fetch a transcript for this video right now. Try another URL or try again in a moment.",
      "transcript_failed"
    );
  }
}

export function durationLabelFromSeconds(seconds: number): string {
  return formatDuration(seconds);
}

export async function fetchYouTubePreview(url: string): Promise<{
  title: string;
  channelName: string;
  thumbnailUrl: string;
}> {
  const normalizedUrl = normalizeYouTubeUrl(url);
  const videoId = extractVideoId(url);

  if (!normalizedUrl || !videoId) {
    throw new UserFacingError("Please enter a valid YouTube URL.", "invalid_url");
  }

  const metadata = await fetchOEmbedMetadata(normalizedUrl);
  return {
    title: metadata.title || `YouTube Video ${videoId}`,
    channelName: metadata.channelName || "YouTube",
    thumbnailUrl: metadata.thumbnailUrl || buildYouTubeThumbnailUrl(videoId)
  };
}

async function fetchOEmbedMetadata(url: string): Promise<{ title: string; channelName: string; thumbnailUrl: string }> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("oEmbed failed");
    }

    const payload = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    return {
      title: payload.title?.trim() || "",
      channelName: payload.author_name?.trim() || "",
      thumbnailUrl: payload.thumbnail_url?.trim() || ""
    };
  } catch {
    return {
      title: "",
      channelName: "",
      thumbnailUrl: ""
    };
  }
}

function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}
