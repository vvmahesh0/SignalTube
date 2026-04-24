import fs from "node:fs";
import path from "node:path";

import type { MemoPresentationMode, PredefinedRoleLensId, RoleLensId, SourceType } from "@/lib/types";

type BuildPromptInput = {
  mode: MemoPresentationMode;
  title: string;
  sourceName: string;
  durationLabel: string;
  sourceUrl: string;
  sourceType: SourceType;
  sourceText: string;
  roleLens: RoleLensId;
  roleName?: string;
  roleDetails?: string;
};

const ROLE_LABELS: Record<PredefinedRoleLensId, string> = {
  hai: "HAI Designer",
  ux: "UX Designer",
  dev: "Developer",
  kid: "I’m a kid"
};

const SOURCE_LABELS: Record<SourceType, string> = {
  youtube: "YouTube transcript",
  medium: "Medium article text",
  substack: "Substack article text",
  blog: "Blog article text"
};

function readPromptFile(fileName: string, fallback: string) {
  try {
    return fs.readFileSync(path.join(process.cwd(), fileName), "utf8").trim();
  } catch {
    return fallback;
  }
}

const SHORT_DIVE_PROMPT = readPromptFile(
  "Article Short Dive Prompt.md",
  "Transform the provided source text into a concise SignalTube Short Dive output."
);

const DEEP_DIVE_PROMPT = readPromptFile(
  "Article Deep Dive Prompt.md",
  "Transform the provided source text into a long-form SignalTube Deep Dive output."
);

const PRESENTATION_PROMPT = readPromptFile(
  "Presentation Prompt.md",
  "Transform the provided source text into a SignalTube presentation output."
);

export function buildGenerationPrompt(input: BuildPromptInput): string {
  const prompt =
    input.mode === "presentation"
      ? PRESENTATION_PROMPT
      : input.mode === "deep"
        ? DEEP_DIVE_PROMPT
        : SHORT_DIVE_PROMPT;
  const sourceLabel = SOURCE_LABELS[input.sourceType];
  const roleName = input.roleName?.trim() || roleLabelFromId(input.roleLens);
  const roleDetails = input.roleDetails?.trim();

  return `${prompt}

## Product runtime instructions

Return valid JSON only. Do not wrap it in markdown fences.

${
  input.mode === "presentation"
    ? `Use this exact JSON shape:
{
  "summary": "short deck-level summary",
  "tags": ["subtle topic tag"],
  "keyIdeas": [{ "title": "short title", "body": "brief explanation" }],
  "concepts": [{ "term": "concept", "definition": "plain-English definition", "whyItMatters": "why it matters here" }],
  "relevance": "role-aware relevance using markdown headings, short paragraphs, and bullets where useful",
  "deepDive": [{ "heading": "optional section", "body": "supporting prose with markdown subheadings, bullets, numbered lists, or blockquotes where useful" }],
  "slides": [
    {
      "slideNumber": 1,
      "title": "slide title",
      "goal": "slide purpose",
      "type": "title | statement | list | quote | action",
      "content": "short paragraph or statement",
      "supportingLabel": "optional small label",
      "keyLine": "optional memorable line",
      "bullets": ["optional bullet"],
      "note": "optional closing note"
    }
  ]
}`
    : input.mode === "deep"
      ? `Use this exact JSON shape:
{
  "summary": "one concise orientation sentence for library/search context",
  "tags": ["subtle topic tag"],
  "deepDive": [{ "heading": "section heading", "body": "long-form editorial prose using markdown subheadings, short paragraphs, bullets, numbered lists, or blockquotes where they improve clarity" }]
}`
      : `Use this exact JSON shape:
{
  "summary": "one paragraph summary",
  "tags": ["subtle topic tag"],
  "keyIdeas": [{ "title": "short title", "body": "2-4 sentence explanation" }],
  "concepts": [{ "term": "concept name", "definition": "plain-English explanation", "whyItMatters": "why it matters here" }],
  "relevance": "role-aware relevance with markdown subheadings, short paragraphs, and bullets where useful"
}`
}

The prompt file may refer to a YouTube transcript. If the source type below is Medium or Substack, treat the supplied source text as article/body text instead. Preserve the same fidelity rules: use only the provided source, do not invent missing claims, and adapt the relevance to the selected role lens.

Role-awareness rules:
- If custom role context is provided, use it as the primary interpretation lens.
- Translate relevance into the user's day-to-day work, important decisions, and requested perspective without inventing unsupported advice.
- If no custom context is provided, use the selected predefined role lens normally.

Formatting rules for string fields:
- You may use markdown inside "relevance" and each deepDive[].body.
- Prefer "###" subheadings for meaningful chunks.
- Use bullets or numbered lists only when they improve scanning.
- Use blockquotes only for faithful paraphrased emphasis grounded in the source; do not fabricate direct quotes.
- Keep paragraphs short enough for an editorial reading interface.
- Do not use markdown tables.

Output mode boundary:
- If the selected output mode is Article Short Dive, generate Short Dive content only. Do not generate Deep Dive sections or slides.
- If the selected output mode is Article Deep Dive, generate Deep Dive content only. Do not generate Short Dive sections or slides.
- If the selected output mode is Presentation, generate slides only as the presentation output. Do not treat article fields as a completed article; they are only supporting metadata unless a separate Article generation is requested.

Source type: ${sourceLabel}
Source title: ${input.title}
Source/channel/publication: ${input.sourceName}
Duration/reading hint: ${input.durationLabel || "Not available"}
Source URL: ${input.sourceUrl}
Selected role_lens: ${roleName}
${roleDetails ? `Custom role context:\n${roleDetails}\n` : ""}
Selected output mode: ${outputModeLabel(input.mode)}

Source text:
${input.sourceText}`;
}

function outputModeLabel(mode: MemoPresentationMode) {
  if (mode === "presentation") return "Presentation";
  if (mode === "deep") return "Article Deep Dive";
  return "Article Short Dive";
}

export function roleLabelFromId(roleLens: RoleLensId) {
  if (roleLens === "hai" || roleLens === "ux" || roleLens === "dev" || roleLens === "kid") {
    return ROLE_LABELS[roleLens];
  }

  return "Custom role";
}
