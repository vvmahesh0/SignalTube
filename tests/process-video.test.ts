import { describe, expect, it } from "vitest";

import { processContentWithOptions, processVideo } from "@/lib/process-video";

const transcript = [
  { text: "AI tools are changing how designers work with software.", offset: 0, duration: 4 },
  { text: "The speaker argues that trust depends on predictable behavior and clear feedback.", offset: 4, duration: 5 },
  { text: "They explain that memory and personalization should feel useful, not invasive.", offset: 9, duration: 6 },
  { text: "The conversation keeps returning to agent UX, delegation, and human control.", offset: 15, duration: 7 },
  { text: "One major theme is that future product teams will need to design for collaboration with models.", offset: 22, duration: 6 }
];

describe("processVideo", () => {
  it("builds a structured memo from transcript data", async () => {
    const result = await processVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      ingest: async () => ({
        sourceType: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoId: "dQw4w9WgXcQ",
        title: "Designing Trustworthy AI Products",
        channelName: "Signal Studio",
        durationLabel: "30 min",
        sourceText: transcript.map((segment) => segment.text).join(" "),
        transcriptStatus: "partial"
      }),
      generateMemo: async (input) => ({
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
        youtubeUrl: input.youtubeUrl,
        videoId: input.videoId,
        title: input.title,
        channelName: input.channelName,
        durationLabel: input.durationLabel,
        readingTime: "4 min read",
        transcriptStatus: input.transcriptStatus,
        transcriptText: input.sourceText,
        tags: ["AI", "product design", "trust"],
        preferredPresentationMode: "short",
        summary:
          "The conversation explores how AI product teams should design for trust, usable memory, and clear human control as model-based systems become more central to real workflows.",
        keyIdeas: [
          {
            title: "Trust depends on legibility",
            body: "The speaker keeps returning to the idea that predictable behavior and clear feedback matter more than impressive demos. Users need to understand what the system is doing and how to respond to it."
          },
          {
            title: "Memory has to feel helpful",
            body: "Personalization only works when it feels like continuity rather than surveillance. The transcript frames this as a product experience problem, not just a technical feature."
          },
          {
            title: "Design shifts toward collaboration",
            body: "The discussion treats AI less as a static feature and more as a collaborator that needs boundaries, delegation patterns, and clear human authority."
          }
        ],
        concepts: [
          {
            term: "Agent UX",
            definition: "Agent UX is the design of systems that take action with some autonomy rather than only responding step by step.",
            whyItMatters:
              "It matters here because the transcript is really about how people stay in control when AI systems become more proactive."
          }
        ],
        deepDive: [
          {
            heading: "Why trust is the central design challenge",
            body: "The transcript argues that trust grows from consistent behavior, legible system actions, and interfaces that help users recover when things go wrong."
          },
          {
            heading: "What this means for future teams",
            body: "The larger implication is that product teams will need to design workflows, guardrails, and collaborative boundaries around models rather than treating them as black-box add-ons."
          }
        ],
        relevance:
          "For Human-AI interaction design, this points toward systems that explain themselves well, keep people oriented, and make oversight an intentional part of the experience.",
        processedAt: input.processedAt,
        analysisProvider: "test-provider",
        analysisModel: "test-model"
      }),
      saveMemo: async (memo) => memo
    });

    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.title).toBe("Designing Trustworthy AI Products");
    expect(result.summary.length).toBeGreaterThan(40);
    expect(result.keyIdeas.length).toBeGreaterThanOrEqual(3);
    expect(result.concepts.length).toBeGreaterThan(0);
    expect(result.deepDive.length).toBeGreaterThanOrEqual(2);
    expect(result.relevance.toLowerCase()).toContain("human-ai");
    expect(result.analysisProvider).toBe("test-provider");
    expect(result.preferredPresentationMode).toBe("short");
    expect(result.originalSourceText).toBe(transcript.map((segment) => segment.text).join(" "));
  });

  it("throws a friendly error for invalid urls", async () => {
    await expect(
      processVideo("https://example.com/video", {
        ingest: async () => {
          throw new Error("should not be called");
        },
        saveMemo: async (memo) => memo
      })
    ).rejects.toThrow("Please enter a valid YouTube URL.");
  });

  it("supports generic blog article ingestion through the article content path", async () => {
    const result = await processContentWithOptions(
      {
        url: "https://example.com/blog/ai-agents-in-design",
        sourceType: "blog",
        presentationMode: "short"
      },
      {
        ingest: async () => ({
          sourceType: "blog",
          sourceUrl: "https://example.com/blog/ai-agents-in-design",
          youtubeUrl: "",
          videoId: "",
          title: "AI Agents in Design Workflows",
          channelName: "Example Blog",
          durationLabel: "",
          sourceText:
            "This article explains how AI agents are changing design workflows, where trust breaks down, and why teams need clearer human oversight.",
          transcriptStatus: "ready"
        }),
        generateMemo: async (input) => ({
          sourceType: input.sourceType,
          sourceUrl: input.sourceUrl,
          youtubeUrl: input.youtubeUrl,
          videoId: input.videoId,
          title: input.title,
          channelName: input.channelName,
          durationLabel: input.durationLabel,
          readingTime: "3 min read",
          transcriptStatus: input.transcriptStatus,
          transcriptText: input.sourceText,
          tags: ["AI", "design"],
          preferredPresentationMode: "short",
          summary: "A concise memo about how AI agents affect design workflows.",
          keyIdeas: [],
          concepts: [],
          deepDive: [],
          relevance: "Useful for teams designing AI-assisted product workflows.",
          processedAt: input.processedAt,
          analysisProvider: "test-provider",
          analysisModel: "test-model"
        }),
        saveMemo: async (memo) => memo
      }
    );

    expect(result.sourceType).toBe("blog");
    expect(result.sourceUrl).toBe("https://example.com/blog/ai-agents-in-design");
    expect(result.youtubeUrl).toBe("");
    expect(result.originalSourceText).toContain("AI agents are changing design workflows");
  });
});
