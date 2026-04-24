"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";

import { ProcessingScreen } from "@/components/signaltube-home";
import { SignalTubeNav } from "@/components/signaltube-nav";
import type { AnalysisProviderId, MemoPresentationMode, MemoRecord } from "@/lib/types";

export function MemoProcessingFlow({
  memo,
  presentationMode
}: {
  memo: MemoRecord;
  presentationMode: MemoPresentationMode;
}) {
  const router = useRouter();
  const startedRef = useRef(false);
  const [done, setDone] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const destination = destinationForMode(memo.id, presentationMode);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    async function generateCounterpart() {
      try {
        const response = await fetch(`/api/memos/${memo.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presentationMode })
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || `We could not create the ${presentationMode}.`);
        }

        setDone(true);
        const elapsed = Date.now() - startedAtRef.current;
        const remaining = Math.max(0, 5600 - elapsed);
        window.setTimeout(() => {
          router.refresh();
          startTransition(() => router.push(destination));
        }, remaining);
      } catch (error) {
        setFailedMessage(error instanceof Error ? error.message : `We could not create the ${presentationMode}.`);
      }
    }

    void generateCounterpart();
  }, [destination, memo.id, presentationMode, router]);

  return (
    <div className="page-shell">
      <SignalTubeNav />
      <ProcessingScreen
        url={memo.sourceUrl || memo.youtubeUrl}
        sourceType={memo.sourceType}
        presentationMode={presentationMode}
        roleLens={memo.roleLens ?? "hai"}
        roleName={memo.roleName}
        provider={providerFromMemo(memo)}
        done={done}
        failedMessage={failedMessage}
        onExit={() => router.push(`/memos/${memo.id}`)}
        initialPreview={{
          title: memo.title,
          channelName: memo.channelName,
          thumbnailUrl: memo.thumbnailUrl ?? "",
          sourceType: memo.sourceType
        }}
        copyLines={[
          "This takes a moment.",
          "We use the video transcript or extracted article text, but not the previously already generated format content to stay close to source."
        ]}
      />
    </div>
  );
}

function destinationForMode(memoId: string, mode: MemoPresentationMode) {
  if (mode === "presentation") return `/memos/${memoId}/slides`;
  if (mode === "deep") return `/memos/${memoId}/deep`;
  return `/memos/${memoId}`;
}

function providerFromMemo(memo: MemoRecord): AnalysisProviderId {
  const provider = memo.analysisProvider?.toLowerCase() ?? "";

  if (provider.includes("claude")) return "claude";
  if (provider.includes("codex") || provider.includes("gpt")) return "codex";
  if (provider.includes("gemini")) return "gemini";
  if (provider.includes("heuristic")) return "heuristic";

  return "auto";
}
