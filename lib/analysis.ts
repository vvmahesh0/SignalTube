import { estimateReadingTime, sentenceCase } from "@/lib/utils";
import { inferMemoTags } from "@/lib/tags";
import type { Concept, DeepDiveSection, KeyIdea, MemoPresentationMode, MemoRecord, RoleLensId, SourceType } from "@/lib/types";

const STOPWORDS = new Set([
  "the",
  "and",
  "that",
  "with",
  "from",
  "they",
  "this",
  "into",
  "about",
  "there",
  "their",
  "have",
  "because",
  "what",
  "when",
  "where",
  "which",
  "while",
  "your",
  "will",
  "just",
  "than",
  "them",
  "being",
  "does",
  "make",
  "much",
  "most",
  "more",
  "some",
  "such",
  "very",
  "really",
  "into",
  "over",
  "also",
  "then",
  "these",
  "those",
  "each",
  "through"
]);

const LENS_TOPICS = [
  {
    name: "Human-AI collaboration",
    keywords: ["human", "ai", "agent", "assistant", "delegate", "collaboration", "workflow"],
    framing:
      "From a Human-AI perspective, the conversation points toward tools that behave less like isolated features and more like working partners that still keep the human in control."
  },
  {
    name: "Trust and usability",
    keywords: ["trust", "feedback", "predictable", "reliable", "safe", "confidence", "clarity"],
    framing:
      "For AI product design, the strongest lesson is that trust is built through legibility: users need to understand what the system is doing, why it is doing it, and where its limits are."
  },
  {
    name: "Memory and personalization",
    keywords: ["memory", "personalization", "context", "profile", "history", "preference"],
    framing:
      "The discussion also reinforces that memory should be experienced as useful continuity rather than invisible surveillance, which is central to future AI-native product design."
  },
  {
    name: "Future-facing design roles",
    keywords: ["future", "designer", "role", "team", "product", "model", "behavior"],
    framing:
      "Professionally, this suggests a design direction where teams will need to shape model behavior, guardrails, and collaborative flows with the same care once reserved for screens and navigation."
  }
];

export function buildHeuristicMemoContent(input: {
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
  processedAt: string;
}): Omit<MemoRecord, "id"> {
  const mode = input.presentationMode as string;
  const transcriptText = input.sourceText.replace(/\s+/g, " ").trim();
  const rankedSentences = rankSentences(transcriptText);
  const summary = rankedSentences.slice(0, 3).join(" ");
  const keyIdeas = buildKeyIdeas(rankedSentences);
  const concepts = buildConcepts(transcriptText);
  const deepDive = buildDeepDive(transcriptText, keyIdeas, concepts);
  const relevance = buildRelevance(transcriptText);
  const tags = inferMemoTags({
    title: input.title,
    channelName: input.channelName,
    summary,
    keyIdeas,
    concepts,
    relevance,
    deepDive
  });
  const articleText = deepDive.map((section) => `${section.heading} ${section.body}`).join(" ");

  return {
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    youtubeUrl: input.youtubeUrl,
    videoId: input.videoId,
    title: input.title,
    channelName: input.channelName,
    thumbnailUrl: input.thumbnailUrl,
    durationLabel: input.durationLabel,
    readingTime: estimateReadingTime(`${summary} ${articleText} ${relevance}`),
    transcriptStatus: input.transcriptStatus,
    transcriptText,
    originalSourceText: transcriptText,
    tags,
    preferredPresentationMode: input.presentationMode,
    articleGenerated: mode === "short" || mode === "article",
    shortGenerated: mode === "short" || mode === "article",
    deepGenerated: mode === "deep",
    presentationGenerated: mode === "presentation",
    roleLens: input.roleLens,
    roleName: input.roleName,
    roleDetails: input.roleDetails,
    presentationSlides:
      mode === "presentation"
        ? buildPresentationSlides(input.title, input.channelName, summary, keyIdeas, concepts, relevance, tags)
        : undefined,
    summary,
    keyIdeas: mode === "deep" ? [] : keyIdeas,
    concepts: mode === "deep" ? [] : concepts,
    deepDive: mode === "short" ? [] : deepDive,
    relevance: mode === "deep" ? "" : relevance,
    processedAt: input.processedAt,
    analysisProvider: "heuristic",
    analysisModel: "deterministic-local"
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
}

function rankSentences(text: string): string[] {
  const sentences = splitSentences(text);
  const frequencies = buildFrequencies(text);

  return sentences
    .map((sentence, index) => ({
      sentence,
      score:
        sentence
          .toLowerCase()
          .split(/[^a-z0-9-]+/)
          .filter(Boolean)
          .reduce((total, word) => total + (frequencies.get(word) ?? 0), 0) +
        (sentences.length - index) * 0.01
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(8, sentences.length))
    .map((item) => sentenceCase(item.sentence));
}

function buildFrequencies(text: string): Map<string, number> {
  const frequencies = new Map<string, number>();

  for (const word of text.toLowerCase().split(/[^a-z0-9-]+/)) {
    if (!word || word.length < 4 || STOPWORDS.has(word)) {
      continue;
    }
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }

  return frequencies;
}

function buildKeyIdeas(sentences: string[]): KeyIdea[] {
  const headings = [
    "What the conversation is really about",
    "The strongest practical takeaway",
    "Why this matters beyond the video"
  ];

  return headings.map((title, index) => ({
    title,
    body: sentences[index] ?? sentences[sentences.length - 1] ?? "The transcript emphasizes a recurring idea, but the available content was thin."
  }));
}

function buildConcepts(text: string): Concept[] {
  const frequencies = [...buildFrequencies(text).entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([word]) => word.length > 5)
    .slice(0, 4);

  return frequencies.map(([term]) => ({
    term: sentenceCase(term.replace(/-/g, " ")),
    definition: `In this video, ${term.replace(/-/g, " ")} appears as a recurring idea that helps explain the speaker's broader argument and why it matters in practice.`,
    whyItMatters: `Here, ${term.replace(/-/g, " ")} acts as a useful lens for understanding the conversation rather than just vocabulary to memorize.`
  }));
}

function buildDeepDive(text: string, keyIdeas: KeyIdea[], concepts: Concept[]): DeepDiveSection[] {
  const sentences = splitSentences(text);
  const chunkSize = Math.max(3, Math.ceil(sentences.length / 3));
  const chunks = [
    sentences.slice(0, chunkSize),
    sentences.slice(chunkSize, chunkSize * 2),
    sentences.slice(chunkSize * 2)
  ].filter((chunk) => chunk.length > 0);

  const headings = [
    "Context and core thesis",
    "Important ideas and tensions",
    "Implications for product and design"
  ];

  return chunks.map((chunk, index) => ({
    heading: headings[index] ?? `Section ${index + 1}`,
    body: composeParagraphs(chunk, keyIdeas[index]?.body, concepts[index]?.term)
  }));
}

function composeParagraphs(chunk: string[], idea?: string, concept?: string): string {
  const first = chunk.slice(0, 2).join(" ");
  const second = chunk.slice(2).join(" ");
  const bridge = idea
    ? `Taken together, these moments reinforce a larger point: ${idea.toLowerCase()}`
    : "Taken together, these moments form the backbone of the video's argument.";
  const conceptLine = concept
    ? `A useful lens for reading this section is ${concept.toLowerCase()}, which keeps surfacing as a practical organizing concept rather than a passing buzzword.`
    : "";

  const signals = [idea, conceptLine].filter(Boolean).map((item) => `- ${item}`);

  return [
    first,
    `### What to pay attention to\n\n${bridge}`,
    second,
    signals.length ? `Key signals:\n\n${signals.join("\n")}` : "",
    conceptLine ? `> ${conceptLine}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildRelevance(text: string): string {
  const lower = text.toLowerCase();
  const matches = LENS_TOPICS.filter((topic) =>
    topic.keywords.some((keyword) => lower.includes(keyword))
  );

  const selected = matches.length > 0 ? matches.slice(0, 3) : LENS_TOPICS.slice(0, 2);

  return selected
    .map((topic, index) => {
      const header = index === 0 ? "### Role signal" : `### ${topic.name}`;
      return `${header}\n\n${topic.framing}`;
    })
    .join("\n\n");
}

function buildPresentationSlides(
  title: string,
  channelName: string,
  summary: string,
  keyIdeas: KeyIdea[],
  concepts: Concept[],
  relevance: string,
  tags: string[]
) {
  return [
    {
      slideNumber: 1,
      title,
      type: "title" as const,
      supportingLabel: "SignalTube Memo",
      content: channelName,
      bullets: tags.slice(0, 3)
    },
    {
      slideNumber: 2,
      title: "The core signal",
      type: "statement" as const,
      supportingLabel: "Snapshot",
      content: summary,
      keyLine: "Start here: this is the central argument worth keeping."
    },
    {
      slideNumber: 3,
      title: "What matters most",
      type: "list" as const,
      supportingLabel: "Key ideas",
      bullets: keyIdeas.map((idea) => idea.title)
    },
    {
      slideNumber: 4,
      title: "Concepts to keep",
      type: "list" as const,
      supportingLabel: "Vocabulary",
      bullets: concepts.map((concept) => `${concept.term}: ${concept.definition}`)
    },
    {
      slideNumber: 5,
      title: "Why it matters",
      type: "action" as const,
      supportingLabel: "Role relevance",
      content: relevance.replace(/^###\s+/gm, "").split(/\n\n+/)[0] ?? relevance,
      bullets: relevance
        .replace(/^###\s+/gm, "")
        .split(/\n\n+/)
        .filter(Boolean)
        .slice(0, 3)
    }
  ];
}
