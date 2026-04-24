import os from "node:os";

import { buildGenerationPrompt } from "@/lib/article-prompt";
import { parseJsonPayload, resolveBinary, runCliCommand } from "@/lib/cli-provider-utils";
import type { MemoPresentationMode, MemoRecord, RoleLensId, SourceType } from "@/lib/types";

type GeminiInput = {
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

export async function generateWithGeminiCli(input: GeminiInput) {
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

  const geminiBinary = await resolveBinary(process.env.SIGNALTUBE_GEMINI_BIN, [
    "/opt/homebrew/bin/gemini",
    "/usr/local/bin/gemini",
    "gemini"
  ]);

  const raw = await runCliCommand(geminiBinary, ["-p", prompt], {
    cwd: os.tmpdir(),
    input: "",
    timeoutMs: 240000
  });

  return parseJsonPayload(raw) as Pick<
    MemoRecord,
    "summary" | "tags" | "keyIdeas" | "concepts" | "relevance" | "deepDive" | "presentationSlides"
  >;
}
