import { z } from "zod";

export const GeneratedShortDiveSchema = z.object({
  summary: z.string().min(1),
  tags: z.array(z.string().min(1)).max(6).default([]),
  keyIdeas: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1)
      })
    )
    .max(5),
  concepts: z
    .array(
      z.object({
        term: z.string().min(1),
        definition: z.string().min(1),
        whyItMatters: z.string().min(1)
      })
    )
    .max(5),
  relevance: z.string().min(1)
});

export const GeneratedDeepDiveSchema = z.object({
  summary: z.string().min(1),
  tags: z.array(z.string().min(1)).max(6).default([]),
  deepDive: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.string().min(1)
      })
    )
    .min(1)
});

export const GeneratedMemoSchema = GeneratedShortDiveSchema.extend({
  deepDive: GeneratedDeepDiveSchema.shape.deepDive
});

export type GeneratedShortDive = z.infer<typeof GeneratedShortDiveSchema>;
export type GeneratedDeepDive = z.infer<typeof GeneratedDeepDiveSchema>;
export type GeneratedMemo = z.infer<typeof GeneratedMemoSchema>;

export const GeneratedPresentationSchema = z.object({
  summary: z.string().min(1),
  tags: z.array(z.string().min(1)).max(6).default([]),
  keyIdeas: z
    .array(
      z.object({
        title: z.string().min(1),
        body: z.string().min(1)
      })
    )
    .max(5)
    .default([]),
  concepts: z
    .array(
      z.object({
        term: z.string().min(1),
        definition: z.string().min(1),
        whyItMatters: z.string().min(1).optional()
      })
    )
    .max(5)
    .default([]),
  relevance: z.string().min(1).default(""),
  deepDive: z
    .array(
      z.object({
        heading: z.string().min(1),
        body: z.string().min(1)
      })
    )
    .default([]),
  slides: z
    .array(
      z.object({
        slideNumber: z.number().int().positive(),
        title: z.string().min(1),
        goal: z.string().optional(),
        type: z.enum(["title", "statement", "list", "quote", "action"]).default("statement"),
        content: z.string().optional(),
        supportingLabel: z.string().optional(),
        keyLine: z.string().optional(),
        bullets: z.array(z.string()).optional(),
        note: z.string().optional()
      })
    )
    .min(5)
    .max(12)
});

export type GeneratedPresentation = z.infer<typeof GeneratedPresentationSchema>;

export const generatedMemoJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "tags", "keyIdeas", "concepts", "relevance", "deepDive"],
  properties: {
    summary: { type: "string", minLength: 1 },
    tags: {
      type: "array",
      maxItems: 6,
      items: { type: "string", minLength: 1 }
    },
    keyIdeas: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body"],
        properties: {
          title: { type: "string", minLength: 1 },
          body: { type: "string", minLength: 1 }
        }
      }
    },
    concepts: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "definition", "whyItMatters"],
        properties: {
          term: { type: "string", minLength: 1 },
          definition: { type: "string", minLength: 1 },
          whyItMatters: { type: "string", minLength: 1 }
        }
      }
    },
    relevance: { type: "string", minLength: 1 },
    deepDive: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "body"],
        properties: {
          heading: { type: "string", minLength: 1 },
          body: { type: "string", minLength: 1 }
        }
      }
    }
  }
} as const;

export const generatedShortDiveJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "tags", "keyIdeas", "concepts", "relevance"],
  properties: {
    summary: generatedMemoJsonSchema.properties.summary,
    tags: generatedMemoJsonSchema.properties.tags,
    keyIdeas: generatedMemoJsonSchema.properties.keyIdeas,
    concepts: generatedMemoJsonSchema.properties.concepts,
    relevance: generatedMemoJsonSchema.properties.relevance
  }
} as const;

export const generatedDeepDiveJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "tags", "deepDive"],
  properties: {
    summary: generatedMemoJsonSchema.properties.summary,
    tags: generatedMemoJsonSchema.properties.tags,
    deepDive: generatedMemoJsonSchema.properties.deepDive
  }
} as const;

export const generatedPresentationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "tags", "keyIdeas", "concepts", "relevance", "deepDive", "slides"],
  properties: {
    summary: { type: "string", minLength: 1 },
    tags: {
      type: "array",
      maxItems: 6,
      items: { type: "string", minLength: 1 }
    },
    keyIdeas: generatedMemoJsonSchema.properties.keyIdeas,
    concepts: generatedMemoJsonSchema.properties.concepts,
    relevance: { type: "string", minLength: 1 },
    deepDive: generatedMemoJsonSchema.properties.deepDive,
    slides: {
      type: "array",
      minItems: 5,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slideNumber", "title", "type"],
        properties: {
          slideNumber: { type: "number" },
          title: { type: "string", minLength: 1 },
          goal: { type: "string" },
          type: { type: "string", enum: ["title", "statement", "list", "quote", "action"] },
          content: { type: "string" },
          supportingLabel: { type: "string" },
          keyLine: { type: "string" },
          bullets: {
            type: "array",
            items: { type: "string" }
          },
          note: { type: "string" }
        }
      }
    }
  }
} as const;
