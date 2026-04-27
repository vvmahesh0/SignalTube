import { buildHeuristicMemoContent } from "@/lib/analysis";
import { generateWithClaudeCli } from "@/lib/article-provider-claude";
import {
  GeneratedDeepDiveSchema,
  GeneratedPresentationSchema,
  GeneratedShortDiveSchema,
  type GeneratedDeepDive,
  type GeneratedPresentation,
  type GeneratedShortDive
} from "@/lib/article-schema";
import { generateWithCodexCli } from "@/lib/article-provider-codex";
import { generateWithGeminiCli } from "@/lib/article-provider-gemini";
import { UserFacingError } from "@/lib/errors";
import { inferMemoTags, normalizeTags } from "@/lib/tags";
import { estimateReadingTime } from "@/lib/utils";
import type { AnalysisProviderId, MemoPresentationMode, MemoRecord, PresentationSlide, RoleLensId, SourceType } from "@/lib/types";

type MemoGenerationInput = {
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
};

export async function generateMemoContent(
  input: MemoGenerationInput
): Promise<Omit<MemoRecord, "id">> {
  const preferredProvider = input.provider ?? process.env.SIGNALTUBE_ANALYZER ?? "auto";
  const allowHeuristicFallback = process.env.SIGNALTUBE_ALLOW_HEURISTIC_FALLBACK === "true";

  if (preferredProvider !== "heuristic") {
    const generated = await tryProviderGeneration(input, preferredProvider, allowHeuristicFallback);
    if (generated) {
      return generated;
    }
  }

  return buildHeuristicMemoContent(input);
}

async function tryProviderGeneration(
  input: MemoGenerationInput,
  preferredProvider: string,
  allowHeuristicFallback: boolean
): Promise<Omit<MemoRecord, "id"> | null> {
  if (!(preferredProvider === "auto" || preferredProvider === "codex" || preferredProvider === "claude" || preferredProvider === "gemini")) {
    return null;
  }

  const providers =
    preferredProvider === "claude"
      ? [{ id: "claude-cli", model: "claude", generate: generateWithClaudeCli }]
      : preferredProvider === "gemini"
        ? [{ id: "gemini-cli", model: "gemini", generate: generateWithGeminiCli }]
      : preferredProvider === "codex"
        ? [{ id: "codex-cli", model: "gpt-5.4", generate: generateWithCodexCli }]
        : [
            { id: "claude-cli", model: "claude", generate: generateWithClaudeCli },
            { id: "codex-cli", model: "gpt-5.4", generate: generateWithCodexCli },
            { id: "gemini-cli", model: "gemini", generate: generateWithGeminiCli }
          ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const raw = await provider.generate(input);
      const result = parseGeneratedPayload(input.presentationMode, raw);
      return toMemoRecord(input, result, provider.id, provider.model);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown provider error.";
      errors.push(`${provider.id}: ${message}`);
      console.error(`[SignalTube] ${provider.id} article generation failed:`, message);
    }
  }

  if (allowHeuristicFallback) {
    return null;
  }

  throw new UserFacingError(
    `AI article generation failed. ${errors.at(-1) ?? "Please make sure a supported CLI provider is installed and signed in."}`,
    "analysis_failed"
  );
}

function toMemoRecord(
  input: MemoGenerationInput,
  result: GeneratedShortDive | GeneratedDeepDive | GeneratedPresentation,
  analysisProvider: string,
  analysisModel: string
): Omit<MemoRecord, "id"> {
  const transcriptText = input.sourceText;
  const deepDive = "deepDive" in result ? result.deepDive : [];
  const keyIdeas = "keyIdeas" in result ? result.keyIdeas : [];
  const concepts = "concepts" in result ? result.concepts : [];
  const relevance = "relevance" in result ? result.relevance : "";
  const articleText = deepDive.map((section) => `${section.heading}\n${section.body}`).join("\n\n");
  const tags = normalizeTags(result.tags);
  const inferredTags = inferMemoTags({
    title: input.title,
    channelName: input.channelName,
    summary: result.summary,
    keyIdeas,
    concepts,
    relevance,
    deepDive
  });

  return {
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    youtubeUrl: input.youtubeUrl,
    videoId: input.videoId,
    title: input.title,
    channelName: input.channelName,
    thumbnailUrl: input.thumbnailUrl,
    durationLabel: input.durationLabel,
    readingTime: estimateReadingTime(
      [result.summary, relevance, articleText, ...keyIdeas.map((idea) => idea.body)].join(" ")
    ),
    transcriptStatus: input.transcriptStatus,
    transcriptText,
    originalSourceText: transcriptText,
    tags: tags.length > 0 ? tags : inferredTags,
    preferredPresentationMode: input.presentationMode,
    articleGenerated: input.presentationMode === "short",
    shortGenerated: input.presentationMode === "short",
    deepGenerated: input.presentationMode === "deep",
    presentationGenerated: input.presentationMode === "presentation" && "slides" in result,
    roleLens: input.roleLens,
    roleName: input.roleName,
    roleDetails: input.roleDetails,
    presentationSlides: "slides" in result ? normalizeSlides(result.slides) : undefined,
    summary: result.summary.trim(),
    keyIdeas: keyIdeas.map((idea) => ({
      title: idea.title.trim(),
      body: idea.body.trim()
    })),
    concepts: concepts.map((concept) => ({
      term: concept.term.trim(),
      definition: concept.definition.trim(),
      whyItMatters: concept.whyItMatters?.trim()
    })),
    deepDive: deepDive.map((section) => ({
      heading: section.heading.trim(),
      body: section.body.trim()
    })),
    relevance: relevance.trim(),
    processedAt: input.processedAt,
    analysisProvider,
    analysisModel
  };
}

export function parseGeneratedPayload(mode: MemoPresentationMode, raw: unknown) {
  if (mode === "presentation") {
    return GeneratedPresentationSchema.parse(normalizePresentationPayload(raw));
  }
  if (mode === "deep") {
    return GeneratedDeepDiveSchema.parse(raw);
  }
  return GeneratedShortDiveSchema.parse(raw);
}

function normalizePresentationPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  const payload = raw as Record<string, unknown>;
  const slides = Array.isArray(payload.slides)
    ? payload.slides.map((slide, index) => normalizePresentationSlide(slide, index))
    : payload.slides;

  return {
    ...payload,
    keyIdeas: Array.isArray(payload.keyIdeas) ? payload.keyIdeas : undefined,
    concepts: Array.isArray(payload.concepts) ? payload.concepts : undefined,
    relevance: typeof payload.relevance === "string" ? payload.relevance : undefined,
    deepDive: Array.isArray(payload.deepDive) ? payload.deepDive : undefined,
    slides
  };
}

function normalizePresentationSlide(slide: unknown, index: number) {
  if (!slide || typeof slide !== "object" || Array.isArray(slide)) {
    return slide;
  }

  const rawSlide = slide as Record<string, unknown>;
  const slideNumber = toPositiveNumber(rawSlide.slideNumber ?? rawSlide.slide_number) ?? index + 1;

  return {
    ...rawSlide,
    slideNumber,
    title: toTrimmedString(rawSlide.title ?? rawSlide.slide_title),
    goal: toOptionalTrimmedString(rawSlide.goal ?? rawSlide.slide_goal),
    type: normalizeSlideType(rawSlide.type ?? rawSlide.slide_type),
    content: toOptionalTrimmedString(rawSlide.content),
    supportingLabel: toOptionalTrimmedString(rawSlide.supportingLabel ?? rawSlide.supporting_label),
    keyLine: toOptionalTrimmedString(rawSlide.keyLine ?? rawSlide.key_line),
    bullets: normalizeBullets(rawSlide.bullets),
    note: toOptionalTrimmedString(rawSlide.note)
  };
}

function normalizeSlideType(value: unknown) {
  const normalized = toOptionalTrimmedString(value)?.toLowerCase();

  if (
    normalized === "title" ||
    normalized === "statement" ||
    normalized === "list" ||
    normalized === "quote" ||
    normalized === "action"
  ) {
    return normalized;
  }

  return "statement";
}

function normalizeBullets(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const bullets = value
    .map((item) => toOptionalTrimmedString(item))
    .filter((item): item is string => Boolean(item));

  return bullets.length ? bullets : undefined;
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalTrimmedString(value: unknown) {
  const trimmed = toTrimmedString(value);
  return trimmed || undefined;
}

function toPositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.trunc(parsed);
    }
  }

  return undefined;
}

function normalizeSlides(slides: GeneratedPresentation["slides"]): PresentationSlide[] {
  return slides.map((slide, index) => ({
    slideNumber: slide.slideNumber || index + 1,
    title: slide.title.trim(),
    goal: slide.goal?.trim(),
    type: slide.type,
    content: slide.content?.trim(),
    supportingLabel: slide.supportingLabel?.trim(),
    keyLine: slide.keyLine?.trim(),
    bullets: slide.bullets?.map((bullet) => bullet.trim()).filter(Boolean),
    note: slide.note?.trim()
  }));
}
