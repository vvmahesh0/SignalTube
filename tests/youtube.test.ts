import { describe, expect, it } from "vitest";

import { extractVideoId, isValidYouTubeUrl, normalizeYouTubeUrl } from "@/lib/youtube";

describe("youtube helpers", () => {
  it("extracts ids from standard watch urls", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ids from short urls", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("dQw4w9WgXcQ");
  });

  it("rejects non-youtube urls", () => {
    expect(extractVideoId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(isValidYouTubeUrl("https://example.com/watch?v=dQw4w9WgXcQ")).toBe(false);
  });

  it("normalizes supported urls into canonical watch links", () => {
    expect(normalizeYouTubeUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
  });
});
