import os from "node:os";

import { buildGenerationPrompt } from "@/lib/article-prompt";
import { generatedDeepDiveJsonSchema, generatedPresentationJsonSchema, generatedShortDiveJsonSchema } from "@/lib/article-schema";
import { parseJsonPayload, resolveBinary, runCliCommand } from "@/lib/cli-provider-utils";
import type { MemoPresentationMode, MemoRecord, RoleLensId, SourceType } from "@/lib/types";

type ClaudeInput = {
  title: string;
  sourceUrl: string;
  sourceType: SourceType;
  channelName: string;
  durationLabel: string;
  sourceText: string;
  roleLens: RoleLensId;
  roleName?: string;
  roleDetails?: string;
  presentationMode: MemoPresentationMode;
};

export async function generateWithClaudeCli(input: ClaudeInput) {
  const prompt = buildGenerationPrompt({
    mode: input.presentationMode,
    title: input.title,
    sourceName: input.channelName,
    durationLabel: input.durationLabel,
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType,
    sourceText: input.sourceText,
    roleLens: input.roleLens,
    roleName: input.roleName,
    roleDetails: input.roleDetails
  });
  const schema =
    input.presentationMode === "presentation"
      ? generatedPresentationJsonSchema
      : input.presentationMode === "deep"
        ? generatedDeepDiveJsonSchema
        : generatedShortDiveJsonSchema;

  const claudeBinary = await resolveBinary(process.env.SIGNALTUBE_CLAUDE_BIN, [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    "claude"
  ]);

  const raw = await runCliCommand(
    claudeBinary,
    [
      "--print",
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(schema)
    ],
    { cwd: os.tmpdir(), input: prompt, timeoutMs: 240000 }
  );

  const payload = parseJsonPayload<{ structured_output?: unknown }>(raw);
  return (payload.structured_output ?? payload) as Pick<
    MemoRecord,
    "summary" | "tags" | "keyIdeas" | "concepts" | "relevance" | "deepDive"
  >;
}
