import { describe, expect, it } from "vitest";

import { buildHeuristicMemoContent } from "@/lib/analysis";

const input = {
  title: "Designing AI Tools",
  sourceType: "youtube" as const,
  sourceUrl: "https://youtube.com/watch?v=test",
  youtubeUrl: "https://youtube.com/watch?v=test",
  videoId: "test",
  channelName: "Signal Studio",
  thumbnailUrl: "",
  durationLabel: "12 min",
  transcriptStatus: "ready" as const,
  sourceText:
    "AI tools are changing how product teams think about trust and usability. Designers need to understand how agents make decisions and how users stay in control. The conversation explains why clear feedback, safe delegation, and predictable model behavior matter for real workflows. It also discusses memory, personalization, and the responsibility of teams building AI-native product experiences.",
  roleLens: "hai" as const,
  processedAt: "2026-04-20T10:00:00.000Z"
};

describe("generation mode boundaries", () => {
  it("generates only short dive availability for short mode", () => {
    const memo = buildHeuristicMemoContent({ ...input, presentationMode: "short" });

    expect(memo.articleGenerated).toBe(true);
    expect(memo.shortGenerated).toBe(true);
    expect(memo.deepGenerated).toBe(false);
    expect(memo.presentationGenerated).toBe(false);
    expect(memo.presentationSlides).toBeUndefined();
    expect(memo.deepDive).toEqual([]);
  });

  it("generates only presentation availability for presentation mode", () => {
    const memo = buildHeuristicMemoContent({ ...input, presentationMode: "presentation" });

    expect(memo.articleGenerated).toBe(false);
    expect(memo.presentationGenerated).toBe(true);
    expect(memo.presentationSlides?.length).toBeGreaterThan(0);
  });

  it("generates only deep dive availability for deep mode", () => {
    const memo = buildHeuristicMemoContent({ ...input, presentationMode: "deep" });

    expect(memo.shortGenerated).toBe(false);
    expect(memo.deepGenerated).toBe(true);
    expect(memo.presentationGenerated).toBe(false);
    expect(memo.keyIdeas).toEqual([]);
    expect(memo.deepDive.length).toBeGreaterThan(0);
  });
});
