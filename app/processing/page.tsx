import { notFound } from "next/navigation";

import { MemoProcessingFlow } from "@/components/memo-processing-flow";
import { getMemo } from "@/lib/storage";
import type { MemoPresentationMode } from "@/lib/types";

export default async function ProcessingPage({
  searchParams
}: {
  searchParams: Promise<{ memoId?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const memoId = params.memoId;
  const presentationMode: MemoPresentationMode =
    params.mode === "presentation" || params.mode === "deep" || params.mode === "short" ? params.mode : "short";

  if (!memoId) {
    notFound();
  }

  const memo = await getMemo(memoId);

  if (!memo) {
    notFound();
  }

  return <MemoProcessingFlow memo={memo} presentationMode={presentationMode} />;
}
