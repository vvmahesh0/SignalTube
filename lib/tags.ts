import type { Concept, DeepDiveSection, KeyIdea } from "@/lib/types";

const TAG_RULES = [
  { tag: "AI", words: ["ai", "artificial intelligence", "model", "llm", "machine learning", "neural"] },
  { tag: "agents", words: ["agent", "autonomy", "delegate", "tool use", "workflow"] },
  { tag: "model behavior", words: ["behavior", "alignment", "eval", "reliability", "hallucination", "inference"] },
  { tag: "product design", words: ["product", "design", "ux", "interface", "user experience", "interaction"] },
  { tag: "research", words: ["research", "study", "paper", "experiment", "evidence"] },
  { tag: "startup", words: ["startup", "founder", "company", "market", "business", "growth"] },
  { tag: "safety", words: ["safety", "risk", "guardrail", "oversight", "security", "incident"] },
  { tag: "reasoning", words: ["reasoning", "thinking", "chain", "logic", "problem solving"] },
  { tag: "memory", words: ["memory", "personalization", "context", "history", "preference"] },
  { tag: "trust", words: ["trust", "confidence", "predictable", "transparent", "explain"] },
  { tag: "education", words: ["learn", "lecture", "explain", "chapter", "course", "teaching"] },
  { tag: "systems", words: ["system", "infrastructure", "compute", "architecture", "platform"] }
];

export function normalizeTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const tag of tags ?? []) {
    const normalized = tag.trim().replace(/\s+/g, " ");
    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }
    seen.add(normalized.toLowerCase());
    clean.push(normalized);
  }

  return clean.slice(0, 6);
}

export function inferMemoTags(input: {
  title: string;
  channelName: string;
  summary: string;
  keyIdeas: KeyIdea[];
  concepts: Concept[];
  relevance: string;
  deepDive: DeepDiveSection[];
}): string[] {
  const haystack = [
    input.title,
    input.channelName,
    input.summary,
    input.relevance,
    ...input.keyIdeas.flatMap((idea) => [idea.title, idea.body]),
    ...input.concepts.flatMap((concept) => [concept.term, concept.definition, concept.whyItMatters ?? ""]),
    ...input.deepDive.flatMap((section) => [section.heading, section.body])
  ]
    .join(" ")
    .toLowerCase();

  const scored = TAG_RULES.map((rule) => ({
    tag: rule.tag,
    score: rule.words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0)
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.tag);

  return normalizeTags(scored.length > 0 ? scored : ["research"]);
}
