import { describe, expect, it } from "vitest";

import { filterAndSortMemos, groupMemosByDate } from "@/lib/library-query";
import type { MemoListItem } from "@/lib/types";

const baseMemo: Omit<MemoListItem, "id" | "title" | "readingTime" | "processedAt" | "searchText"> = {
  sourceType: "youtube",
  sourceUrl: "https://youtube.com/watch?v=test",
  videoId: "test",
  channelName: "Signal Studio",
  thumbnailUrl: "",
  summary: "A memo about AI products.",
  transcriptStatus: "ready",
  tags: ["AI"],
  preferredPresentationMode: "short",
  articleGenerated: true,
  shortGenerated: true,
  deepGenerated: false,
  presentationGenerated: false
};

function memo(overrides: Partial<MemoListItem> & Pick<MemoListItem, "id" | "title" | "processedAt" | "readingTime">): MemoListItem {
  return {
    ...baseMemo,
    ...overrides,
    searchText: overrides.searchText ?? `${overrides.title} Signal Studio AI`.toLowerCase()
  };
}

describe("library query helpers", () => {
  const now = new Date("2026-04-20T12:00:00.000Z");
  const items = [
    memo({ id: "today-long", title: "Today long", processedAt: "2026-04-20T09:00:00.000Z", readingTime: "9 min read" }),
    memo({ id: "yesterday", title: "Yesterday", processedAt: "2026-04-19T10:00:00.000Z", readingTime: "4 min read" }),
    memo({ id: "week", title: "This week", processedAt: "2026-04-17T10:00:00.000Z", readingTime: "2 min read" }),
    memo({ id: "earlier", title: "Earlier", processedAt: "2026-04-05T10:00:00.000Z", readingTime: "6 min read" })
  ];

  it("sorts newest, oldest, and reading time from underlying data", () => {
    expect(filterAndSortMemos(items, "", "newest").map((item) => item.id)).toEqual([
      "today-long",
      "yesterday",
      "week",
      "earlier"
    ]);
    expect(filterAndSortMemos(items, "", "oldest").map((item) => item.id)).toEqual([
      "earlier",
      "week",
      "yesterday",
      "today-long"
    ]);
    expect(filterAndSortMemos(items, "", "reading").map((item) => item.id)).toEqual([
      "week",
      "yesterday",
      "earlier",
      "today-long"
    ]);
  });

  it("groups by calendar recency including yesterday", () => {
    const groups = groupMemosByDate(items, "newest", now);

    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", "This week", "Earlier"]);
    expect(groups.map((group) => group.items[0]?.id)).toEqual(["today-long", "yesterday", "week", "earlier"]);
  });
});
