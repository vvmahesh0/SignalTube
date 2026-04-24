import { binaryStatus } from "@/lib/cli-provider-utils";
import type { AnalysisProviderId, ProviderStatus } from "@/lib/types";

export function getSelectedProvider(): AnalysisProviderId {
  const raw = process.env.SIGNALTUBE_ANALYZER;
  if (raw === "codex" || raw === "claude" || raw === "gemini" || raw === "heuristic") {
    return raw;
  }
  return "auto";
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const selected = getSelectedProvider();
  const [codex, claude, gemini] = await Promise.all([
    binaryStatus(process.env.SIGNALTUBE_CODEX_BIN, ["/opt/homebrew/bin/codex", "/usr/local/bin/codex", "codex"]),
    binaryStatus(process.env.SIGNALTUBE_CLAUDE_BIN, ["/opt/homebrew/bin/claude", "/usr/local/bin/claude", "claude"]),
    binaryStatus(process.env.SIGNALTUBE_GEMINI_BIN, ["/opt/homebrew/bin/gemini", "/usr/local/bin/gemini", "gemini"])
  ]);

  return [
    {
      id: "auto",
      label: "Auto",
      available: claude.available || codex.available || gemini.available,
      selected: selected === "auto",
      detail: claude.available
        ? "Auto will use Claude CLI first on this Mac."
        : codex.available
          ? "Auto will use Codex CLI on this Mac."
          : gemini.available
            ? "Gemini CLI is detected, but generation support is not enabled yet."
            : "Install or sign in to Claude CLI or Codex CLI."
    },
    {
      id: "codex",
      label: "Codex CLI",
      available: codex.available,
      selected: selected === "codex",
      detail: codex.available ? "Ready for local article generation." : "Codex CLI was not found.",
      binaryPath: codex.binaryPath
    },
    {
      id: "claude",
      label: "Claude CLI",
      available: claude.available,
      selected: selected === "claude",
      detail: claude.available ? "Ready for local article generation." : "Claude CLI was not found.",
      binaryPath: claude.binaryPath
    },
    {
      id: "gemini",
      label: "Gemini",
      available: gemini.available,
      selected: selected === "gemini",
      detail: gemini.available ? "Ready for local article generation." : "Gemini CLI was not found.",
      binaryPath: gemini.binaryPath
    },
    {
      id: "heuristic",
      label: "Local fallback",
      available: true,
      selected: selected === "heuristic",
      detail: "No LLM. Useful only as a backup when provider CLIs are unavailable."
    }
  ];
}
