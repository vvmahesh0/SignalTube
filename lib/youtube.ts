const VALID_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be"
]);

export function extractVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!VALID_HOSTS.has(url.hostname)) {
      return null;
    }

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return isLikelyVideoId(id) ? id : null;
    }

    const watchId = url.searchParams.get("v");
    if (isLikelyVideoId(watchId)) {
      return watchId;
    }

    const embedMatch = url.pathname.match(/\/(embed|shorts)\/([^/?]+)/);
    if (embedMatch && isLikelyVideoId(embedMatch[2])) {
      return embedMatch[2];
    }

    return null;
  } catch {
    return null;
  }
}

export function isValidYouTubeUrl(value: string): boolean {
  return extractVideoId(value) !== null;
}

export function normalizeYouTubeUrl(value: string): string | null {
  const videoId = extractVideoId(value);
  if (!videoId) {
    return null;
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}

function isLikelyVideoId(value: string | null | undefined): value is string {
  return Boolean(value && /^[a-zA-Z0-9_-]{8,15}$/.test(value));
}
