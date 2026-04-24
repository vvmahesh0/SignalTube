import { describe, expect, it } from "vitest";

import { buildGenerationPrompt } from "@/lib/article-prompt";

describe("role-aware prompt wiring", () => {
  it("includes custom role name and details in article prompts", () => {
    const prompt = buildGenerationPrompt({
      mode: "short",
      title: "Designing AI Products",
      sourceName: "Signal Studio",
      durationLabel: "12 min",
      sourceUrl: "https://example.com",
      sourceType: "medium",
      sourceText: "AI product teams need better evaluation and trust patterns.",
      roleLens: "custom:product-lead",
      roleName: "AI Product Lead",
      roleDetails: [
        "Day-to-day role: I shape roadmap and review product quality.",
        "Important decisions or outcomes: I need product risks and user value.",
        "Interpretation lens: Translate technical ideas into product strategy."
      ].join("\n")
    });

    expect(prompt).toContain("Selected role_lens: AI Product Lead");
    expect(prompt).toContain("Custom role context:");
    expect(prompt).toContain("Translate technical ideas into product strategy");
  });
});
