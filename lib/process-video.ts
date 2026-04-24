import { UserFacingError } from "@/lib/errors";
import { generateMemoContent } from "@/lib/article-provider";
import { ingestSource, type IngestedSource } from "@/lib/source-ingestion";
import { saveMemo as persistMemo } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { extractVideoId, normalizeYouTubeUrl } from "@/lib/youtube";
import type { AnalysisProviderId, MemoPresentationMode, MemoRecord, RoleLensId, SourceType } from "@/lib/types";

type Dependencies = {
  ingest?: (url: string, sourceType: SourceType) => Promise<IngestedSource>;
  saveMemo?: (memo: MemoRecord) => Promise<MemoRecord>;
  generateMemo?: (input: {
    title: string;
    sourceType: SourceType;
    sourceUrl: string;
    youtubeUrl: string;
    videoId: string;
    channelName: string;
    thumbnailUrl?: string;
    durationLabel: string;
    transcriptStatus: MemoRecord["transcriptStatus"];
    sourceText: string;
    roleLens: RoleLensId;
    roleName?: string;
    roleDetails?: string;
    presentationMode: MemoPresentationMode;
    provider?: AnalysisProviderId;
    processedAt: string;
  }) => Promise<Omit<MemoRecord, "id">>;
};

export async function processVideo(url: string, deps: Dependencies = {}): Promise<MemoRecord> {
  return processContentWithOptions({ url, sourceType: "youtube" }, deps);
}

export async function processVideoWithOptions(
  options: { url: string; presentationMode?: MemoPresentationMode },
  deps: Dependencies = {}
): Promise<MemoRecord> {
  return processContentWithOptions({ ...options, sourceType: "youtube" }, deps);
}

export async function processContentWithOptions(
  options: {
    url: string;
    sourceType?: SourceType;
    presentationMode?: MemoPresentationMode;
    roleLens?: RoleLensId;
    roleName?: string;
    roleDetails?: string;
    provider?: AnalysisProviderId;
  },
  deps: Dependencies = {}
): Promise<MemoRecord> {
  const sourceType = normalizeSourceType(options.sourceType);
  const presentationMode = normalizePresentationMode(options.presentationMode);
  const roleLens = normalizeRoleLens(options.roleLens);

  if (sourceType === "youtube" && (!normalizeYouTubeUrl(options.url) || !extractVideoId(options.url))) {
    throw new UserFacingError("Please enter a valid YouTube URL.", "invalid_url");
  }

  const source = await (deps.ingest ?? ingestSource)(options.url, sourceType);
  const processedAt = new Date().toISOString();
  const generator = deps.generateMemo ?? generateMemoContent;

  if (!source.sourceText.trim()) {
    throw new UserFacingError("We could not find enough source text to analyze.", "source_text_unavailable");
  }

  const memoBase = await generator({
    title: source.title,
    sourceType,
    sourceUrl: source.sourceUrl,
    youtubeUrl: source.youtubeUrl,
    videoId: source.videoId,
    channelName: source.channelName,
    thumbnailUrl: source.thumbnailUrl,
    durationLabel: source.durationLabel,
    transcriptStatus: source.transcriptStatus,
    sourceText: source.sourceText,
    roleLens,
    roleName: options.roleName,
    roleDetails: options.roleDetails,
    presentationMode,
    provider: options.provider,
    processedAt
  });

  const sourceSlug = source.videoId || slugify(new URL(source.sourceUrl).hostname.replace(/^www\./, ""));
  const memo: MemoRecord = {
    id: `${sourceSlug}-${slugify(source.title) || "memo"}`,
    ...memoBase,
    transcriptText: memoBase.transcriptText || source.sourceText,
    originalSourceText: source.sourceText,
    preferredPresentationMode: presentationMode,
    roleLens,
    roleName: options.roleName,
    roleDetails: options.roleDetails
  };

  return (deps.saveMemo ?? persistMemo)(memo);
}

function normalizeSourceType(sourceType?: SourceType): SourceType {
  return sourceType === "medium" || sourceType === "substack" || sourceType === "blog" || sourceType === "youtube" ? sourceType : "youtube";
}

function normalizePresentationMode(mode?: MemoPresentationMode): MemoPresentationMode {
  return mode === "presentation" || mode === "deep" || mode === "short" ? mode : "short";
}

function normalizeRoleLens(roleLens?: RoleLensId): RoleLensId {
  return roleLens === "ux" || roleLens === "dev" || roleLens === "kid" || roleLens === "hai" || roleLens?.startsWith("custom:")
    ? roleLens
    : "hai";
}
