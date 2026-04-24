import { describe, expect, it } from "vitest";

import { parseGeneratedPayload } from "@/lib/article-provider";

describe("presentation payload parsing", () => {
  it("accepts snake_case slide fields from updated prompt outputs", () => {
    const result = parseGeneratedPayload("presentation", {
      summary: "A concise deck summary.",
      tags: ["ai", "product"],
      keyIdeas: [],
      concepts: [],
      relevance: "Why this matters for the selected role.",
      deepDive: [],
      slides: [
        {
          slide_number: 1,
          slide_title: "Why this matters",
          slide_goal: "Orient the reader",
          slide_type: "title",
          content: "A short opening line.",
          supporting_label: "Overview",
          key_line: "The signal comes first.",
          bullets: ["Fast understanding", "Role-aware framing"],
          note: "Keep it grounded."
        },
        {
          slide_number: "2",
          slide_title: "What changes",
          slide_goal: "Show implications",
          slide_type: "action",
          content: "A short implication statement."
        },
        {
          slide_number: 3,
          slide_title: "Idea one",
          slide_goal: "Explain a core point",
          slide_type: "statement",
          content: "A short supporting paragraph."
        },
        {
          slide_number: 4,
          slide_title: "Concepts",
          slide_goal: "Clarify terms",
          slide_type: "list",
          bullets: ["Concept one", "Concept two"]
        },
        {
          slide_number: 5,
          slide_title: "Closing",
          slide_goal: "Leave a clear takeaway",
          slide_type: "quote",
          key_line: "Use the original source, not a generated rewrite."
        }
      ]
    });

    expect(result.slides[0]).toMatchObject({
      slideNumber: 1,
      title: "Why this matters",
      goal: "Orient the reader",
      type: "title",
      supportingLabel: "Overview",
      keyLine: "The signal comes first."
    });
    expect(result.slides[1]?.slideNumber).toBe(2);
    expect(result.slides[4]?.type).toBe("quote");
  });
});
