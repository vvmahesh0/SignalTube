import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildGenerationPrompt } from "@/lib/article-prompt";
import { generatedDeepDiveJsonSchema, generatedPresentationJsonSchema, generatedShortDiveJsonSchema } from "@/lib/article-schema";
import { parseJsonPayload, resolveBinary, runCliCommand } from "@/lib/cli-provider-utils";
import type { MemoPresentationMode, MemoRecord, RoleLensId, SourceType } from "@/lib/types";

type CodexInput = {
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

export async function generateWithCodexCli(input: CodexInput) {
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

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "signaltube-codex-"));
  const schemaPath = path.join(tempDir, "memo-schema.json");
  const outputPath = path.join(tempDir, "memo-output.json");

  try {
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2), "utf8");
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
      { cwd: tempDir, input: prompt, timeoutMs: 180000 }
    );

    const raw = await fs.readFile(outputPath, "utf8");
    return parseJsonPayload(raw) as Pick<
      MemoRecord,
      "summary" | "tags" | "keyIdeas" | "concepts" | "relevance" | "deepDive"
    >;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
