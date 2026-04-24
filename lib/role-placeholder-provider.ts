import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { z } from "zod";

import { parseJsonPayload, resolveBinary, runCliCommand } from "@/lib/cli-provider-utils";
import { getProviderStatuses } from "@/lib/provider-status";
import type { AnalysisProviderId } from "@/lib/types";

const RolePlaceholderSchema = z.object({
  dayToDay: z.string(),
  decisions: z.string(),
  perspective: z.string(),
  extra: z.string()
});

export type AdaptiveRolePlaceholders = z.infer<typeof RolePlaceholderSchema>;

const ROLE_PLACEHOLDER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dayToDay", "decisions", "perspective", "extra"],
  properties: {
    dayToDay: { type: "string" },
    decisions: { type: "string" },
    perspective: { type: "string" },
    extra: { type: "string" }
  }
};

const GENERIC_ROLE_PLACEHOLDERS: AdaptiveRolePlaceholders = {
  dayToDay: "e.g. I review research, design workflows, write briefs, or explain technical ideas to clients",
  decisions: "e.g. shipping faster, improving trust, making better product decisions, or reducing errors",
  perspective: "e.g. focus on product implications, simplify jargon, or surface business signals",
  extra: "e.g. I work in healthcare, I am new to AI, or I need outputs I can quickly share with my team"
};

export async function generateAdaptiveRolePlaceholders(roleName: string, provider: AnalysisProviderId = "auto") {
  const trimmedRoleName = roleName.trim();
  if (!trimmedRoleName) {
    throw new Error("Role name is required.");
  }

  const prompt = buildRolePlaceholderPrompt(trimmedRoleName);
  const providers = await resolveProviderOrder(provider);
  const errors: string[] = [];

  for (const providerId of providers) {
    try {
      const raw =
        providerId === "claude"
          ? await generateWithClaude(prompt)
          : providerId === "codex"
            ? await generateWithCodex(prompt)
            : await generateWithGemini(prompt);

      return sanitizeAdaptivePlaceholders(RolePlaceholderSchema.parse(raw));
    } catch (error) {
      errors.push(`${providerId}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  throw new Error(errors.at(-1) ?? "No supported provider was available.");
}

function buildRolePlaceholderPrompt(roleName: string) {
  return `You are writing concise placeholder examples for a role-setup form in a premium desktop app.

Role name: ${roleName}

Return valid JSON only with exactly these keys:
- dayToDay
- decisions
- perspective
- extra

Rules:
- Each value must be a single line.
- Each value must begin with "e.g. ".
- Each value should be 120 characters or fewer.
- Each value should sound natural, concrete, and distinct from the others.
- Tailor the examples to the specific role name above.
- Do not mention the app.
- Do not include markdown, bullets, numbering, or extra keys.

Field intent:
- dayToDay: examples of the user's actual day-to-day work
- decisions: examples of what outcomes, risks, or decisions matter in that role
- perspective: examples of the interpretation lens they want the app to use
- extra: examples of optional context such as industry, experience level, team context, or constraints`;
}

async function resolveProviderOrder(provider: AnalysisProviderId) {
  if (provider === "claude" || provider === "codex" || provider === "gemini") {
    return [provider];
  }

  const statuses = await getProviderStatuses();
  return statuses
    .filter((item) => item.available && (item.id === "claude" || item.id === "codex" || item.id === "gemini"))
    .sort((left, right) => providerPriority(left.id) - providerPriority(right.id))
    .map((item) => item.id);
}

function providerPriority(provider: AnalysisProviderId) {
  if (provider === "claude") return 0;
  if (provider === "codex") return 1;
  if (provider === "gemini") return 2;
  return 9;
}

async function generateWithClaude(prompt: string) {
  const claudeBinary = await resolveBinary(process.env.SIGNALTUBE_CLAUDE_BIN, [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "claude"
  ]);

  const raw = await runCliCommand(
    claudeBinary,
    ["--print", "--output-format", "json", "--json-schema", JSON.stringify(ROLE_PLACEHOLDER_JSON_SCHEMA)],
    { cwd: os.tmpdir(), input: prompt, timeoutMs: 20000 }
  );

  const payload = parseJsonPayload<{ structured_output?: unknown }>(raw);
  return payload.structured_output ?? payload;
}

async function generateWithCodex(prompt: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "signaltube-role-placeholders-"));
  const schemaPath = path.join(tempDir, "placeholder-schema.json");
  const outputPath = path.join(tempDir, "placeholder-output.json");

  try {
    await fs.writeFile(schemaPath, JSON.stringify(ROLE_PLACEHOLDER_JSON_SCHEMA, null, 2), "utf8");
    const codexBinary = await resolveBinary(process.env.SIGNALTUBE_CODEX_BIN, [
      "/opt/homebrew/bin/codex",
      "/usr/local/bin/codex",
      "codex"
    ]);

    await runCliCommand(
      codexBinary,
      [
        "exec",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        "-"
      ],
      { cwd: tempDir, input: prompt, timeoutMs: 20000 }
    );

    return parseJsonPayload(await fs.readFile(outputPath, "utf8"));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function generateWithGemini(prompt: string) {
  const geminiBinary = await resolveBinary(process.env.SIGNALTUBE_GEMINI_BIN, [
    "/opt/homebrew/bin/gemini",
    "/usr/local/bin/gemini",
    "gemini"
  ]);

  const raw = await runCliCommand(geminiBinary, ["-p", prompt], {
    cwd: os.tmpdir(),
    input: "",
    timeoutMs: 20000
  });

  return parseJsonPayload(raw);
}

function sanitizeAdaptivePlaceholders(placeholders: AdaptiveRolePlaceholders): AdaptiveRolePlaceholders {
  const used = new Set<string>();

  return {
    dayToDay: sanitizePlaceholder(placeholders.dayToDay, GENERIC_ROLE_PLACEHOLDERS.dayToDay, used),
    decisions: sanitizePlaceholder(placeholders.decisions, GENERIC_ROLE_PLACEHOLDERS.decisions, used),
    perspective: sanitizePlaceholder(placeholders.perspective, GENERIC_ROLE_PLACEHOLDERS.perspective, used),
    extra: sanitizePlaceholder(placeholders.extra, GENERIC_ROLE_PLACEHOLDERS.extra, used)
  };
}

function sanitizePlaceholder(value: string, fallback: string, used: Set<string>) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  const prefixed = collapsed.toLowerCase().startsWith("e.g.") ? collapsed : `e.g. ${collapsed.replace(/^for example:\s*/i, "")}`;
  const singleLine = prefixed.replace(/\n/g, " ").trim();
  const bounded = singleLine.length > 120 ? `${singleLine.slice(0, 117).trimEnd()}...` : singleLine;
  const lowered = bounded.toLowerCase();

  if (lowered.length < 18 || used.has(lowered)) {
    return fallback;
  }

  used.add(lowered);
  return bounded;
}
