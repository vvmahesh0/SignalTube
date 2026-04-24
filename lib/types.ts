export type TranscriptSegment = {
  text: string;
  offset: number;
  duration: number;
};

export type FetchTranscriptResult = {
  title: string;
  channelName: string;
  durationSeconds: number;
  transcript: TranscriptSegment[];
  thumbnailUrl?: string;
};

export type KeyIdea = {
  title: string;
  body: string;
};

export type Concept = {
  term: string;
  definition: string;
  whyItMatters?: string;
};

export type DeepDiveSection = {
  heading: string;
  body: string;
};

export type TranscriptStatus = "ready" | "partial" | "unavailable" | "failed";
export type SourceType = "youtube" | "medium" | "substack" | "blog";
export type MemoPresentationMode = "short" | "deep" | "presentation";
export type LegacyMemoPresentationMode = MemoPresentationMode | "article" | "slides";
export type MemoSortOrder = "newest" | "oldest" | "reading";
export type PredefinedRoleLensId = "hai" | "ux" | "dev" | "kid";
export type RoleLensId = PredefinedRoleLensId | `custom:${string}`;
export type AnalysisProviderId = "auto" | "codex" | "claude" | "gemini" | "heuristic";

export type CustomRole = {
  id: string;
  name: string;
  dayToDay: string;
  decisions: string;
  perspective: string;
  extra?: string;
  createdAt: string;
};

export type PresentationSlide = {
  slideNumber: number;
  title: string;
  goal?: string;
  type: "title" | "statement" | "list" | "quote" | "action";
  content?: string;
  supportingLabel?: string;
  keyLine?: string;
  bullets?: string[];
  note?: string;
};

export type MemoRecord = {
  id: string;
  sourceType: SourceType;
  sourceUrl: string;
  youtubeUrl: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl?: string;
  durationLabel: string;
  readingTime: string;
  transcriptStatus: TranscriptStatus;
  transcriptText: string;
  originalSourceText?: string;
  tags: string[];
  preferredPresentationMode?: MemoPresentationMode;
  articleGenerated?: boolean;
  shortGenerated?: boolean;
  deepGenerated?: boolean;
  presentationGenerated?: boolean;
  roleLens?: RoleLensId;
  roleName?: string;
  roleDetails?: string;
  presentationSlides?: PresentationSlide[];
  summary: string;
  keyIdeas: KeyIdea[];
  concepts: Concept[];
  deepDive: DeepDiveSection[];
  relevance: string;
  processedAt: string;
  analysisProvider?: string;
  analysisModel?: string;
};

export type MemoListItem = Pick<
  MemoRecord,
  | "id"
  | "sourceType"
  | "sourceUrl"
  | "videoId"
  | "title"
  | "channelName"
  | "thumbnailUrl"
  | "readingTime"
  | "processedAt"
  | "summary"
  | "transcriptStatus"
  | "tags"
  | "preferredPresentationMode"
  | "articleGenerated"
  | "shortGenerated"
  | "deepGenerated"
  | "presentationGenerated"
> & {
  searchText: string;
};

export type ProviderStatus = {
  id: AnalysisProviderId;
  label: string;
  available: boolean;
  selected: boolean;
  detail: string;
  binaryPath?: string;
};
