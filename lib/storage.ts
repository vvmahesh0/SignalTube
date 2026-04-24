import fs from "node:fs/promises";
import path from "node:path";

import { inferMemoTags, normalizeTags } from "@/lib/tags";
import type { MemoListItem, MemoRecord } from "@/lib/types";

const DATA_DIR = process.env.SIGNALTUBE_DATA_DIR ?? path.join(process.cwd(), "data", "memos");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function saveMemo(memo: MemoRecord): Promise<MemoRecord> {
  await ensureDataDir();
  const normalized = normalizeMemo(memo);
  const filePath = path.join(DATA_DIR, `${normalized.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export async function getMemo(id: string): Promise<MemoRecord | null> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeMemo(JSON.parse(raw) as MemoRecord);
  } catch {
    return null;
  }
}

export async function updateMemo(
  id: string,
  update: Partial<Pick<MemoRecord, "tags" | "preferredPresentationMode">>
): Promise<MemoRecord | null> {
  const memo = await getMemo(id);
  if (!memo) {
    return null;
  }

  return saveMemo({
    ...memo,
    ...(update.preferredPresentationMode ? { preferredPresentationMode: update.preferredPresentationMode } : {}),
    tags: update.tags ? normalizeTags(update.tags) : memo.tags
  });
}

export async function deleteMemo(id: string): Promise<boolean> {
  try {
    await fs.unlink(path.join(DATA_DIR, `${id}.json`));
    return true;
  } catch {
    return false;
  }
}

export async function listMemos(): Promise<MemoListItem[]> {
  await ensureDataDir();
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });

  const memos = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const raw = await fs.readFile(path.join(DATA_DIR, entry.name), "utf8");
        return normalizeMemo(JSON.parse(raw) as MemoRecord);
      })
  );

  return memos
    .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime())
    .map((memo) => ({
      id: memo.id,
      sourceType: memo.sourceType,
      sourceUrl: memo.sourceUrl,
      videoId: memo.videoId,
      title: memo.title,
      channelName: memo.channelName,
      thumbnailUrl: memo.thumbnailUrl,
      readingTime: memo.readingTime,
      processedAt: memo.processedAt,
      summary: memo.summary,
      transcriptStatus: memo.transcriptStatus,
      tags: memo.tags,
      preferredPresentationMode: memo.preferredPresentationMode,
      articleGenerated: memo.articleGenerated,
      shortGenerated: memo.shortGenerated,
      deepGenerated: memo.deepGenerated,
      presentationGenerated: memo.presentationGenerated,
      searchText: buildSearchText(memo)
    }));
}

function normalizeMemo(memo: MemoRecord): MemoRecord {
  const tags = normalizeTags(memo.tags);
  const legacyMode = memo.preferredPresentationMode as MemoRecord["preferredPresentationMode"] | "article" | "slides" | undefined;
  const hasSlides = Boolean(memo.presentationSlides?.length);
  const hasShort = Boolean(memo.summary || memo.keyIdeas?.length || memo.concepts?.length || memo.relevance);
  const hasDeep = Boolean(memo.deepDive?.length);
  const normalized: MemoRecord = {
    ...memo,
    sourceType: memo.sourceType ?? "youtube",
    sourceUrl: memo.sourceUrl ?? memo.youtubeUrl,
    youtubeUrl: memo.youtubeUrl ?? memo.sourceUrl ?? "",
    videoId: memo.videoId ?? "",
    thumbnailUrl: memo.thumbnailUrl ?? (memo.videoId ? `https://img.youtube.com/vi/${memo.videoId}/mqdefault.jpg` : undefined),
    transcriptText: memo.transcriptText ?? memo.originalSourceText ?? "",
    originalSourceText: memo.originalSourceText ?? memo.transcriptText ?? "",
    tags:
      tags.length > 0
        ? tags
        : inferMemoTags({
            title: memo.title,
            channelName: memo.channelName,
            summary: memo.summary,
            keyIdeas: memo.keyIdeas,
            concepts: memo.concepts,
            relevance: memo.relevance,
            deepDive: memo.deepDive
          }),
    preferredPresentationMode: legacyMode === "slides" ? "presentation" : legacyMode === "article" ? "short" : legacyMode ?? "short",
    articleGenerated: memo.articleGenerated ?? hasShort,
    shortGenerated: memo.shortGenerated ?? memo.articleGenerated ?? hasShort,
    deepGenerated: memo.deepGenerated ?? (legacyMode === "article" ? hasDeep : hasDeep),
    presentationGenerated: memo.presentationGenerated ?? hasSlides
  };

  return normalized;
}

function buildSearchText(memo: MemoRecord): string {
  return [
    memo.title,
    memo.sourceType,
    memo.sourceUrl,
    memo.channelName,
    memo.roleName,
    memo.roleDetails,
    memo.summary,
    memo.relevance,
    memo.originalSourceText,
    memo.transcriptText,
    ...memo.tags,
    ...memo.keyIdeas.flatMap((idea) => [idea.title, idea.body]),
    ...memo.concepts.flatMap((concept) => [concept.term, concept.definition, concept.whyItMatters ?? ""]),
    ...memo.deepDive.flatMap((section) => [section.heading, section.body])
  ]
    .join(" ")
    .toLowerCase();
}
