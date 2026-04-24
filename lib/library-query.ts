import type { MemoListItem, MemoSortOrder } from "@/lib/types";

export type MemoDateGroup = {
  label: "Today" | "Yesterday" | "This week" | "Earlier";
  items: MemoListItem[];
};

const DAY_MS = 86_400_000;

export function filterAndSortMemos(items: MemoListItem[], query: string, sortOrder: MemoSortOrder) {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return items
    .filter((item) => {
      if (terms.length === 0) {
        return true;
      }

      const haystack = item.searchText || [item.title, item.channelName, item.summary, ...item.tags].join(" ").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    })
    .sort((a, b) => compareMemos(a, b, sortOrder));
}

export function groupMemosByDate(items: MemoListItem[], sortOrder: MemoSortOrder, now = new Date()): MemoDateGroup[] {
  const groups: MemoDateGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] }
  ];

  for (const item of items) {
    const label = getDateGroupLabel(item.processedAt, now);
    groups.find((group) => group.label === label)?.items.push(item);
  }

  const orderedGroups = sortOrder === "oldest" ? [...groups].reverse() : groups;

  return orderedGroups
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => compareMemos(a, b, sortOrder))
    }))
    .filter((group) => group.items.length > 0);
}

export function getDateGroupLabel(isoDate: string, now = new Date()): MemoDateGroup["label"] {
  const itemDate = new Date(isoDate);

  if (Number.isNaN(itemDate.getTime())) {
    return "Earlier";
  }

  const todayStart = startOfLocalDay(now).getTime();
  const itemStart = startOfLocalDay(itemDate).getTime();
  const diffDays = Math.floor((todayStart - itemStart) / DAY_MS);

  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return "This week";
  }

  return "Earlier";
}

function compareMemos(a: MemoListItem, b: MemoListItem, sortOrder: MemoSortOrder) {
  if (sortOrder === "reading") {
    return readingMinutes(a.readingTime) - readingMinutes(b.readingTime) || newestFirst(a, b);
  }

  return sortOrder === "oldest" ? oldestFirst(a, b) : newestFirst(a, b);
}

function newestFirst(a: MemoListItem, b: MemoListItem) {
  return new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime();
}

function oldestFirst(a: MemoListItem, b: MemoListItem) {
  return new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime();
}

function readingMinutes(label: string) {
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
