import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { generateMemoContent } from "@/lib/article-provider";
import { UserFacingError } from "@/lib/errors";
import { getMemo, saveMemo } from "@/lib/storage";
import type { AnalysisProviderId, MemoPresentationMode, MemoRecord } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      presentationMode?: MemoPresentationMode;
      provider?: AnalysisProviderId;
    };
    const presentationMode: MemoPresentationMode =
      body.presentationMode === "presentation" || body.presentationMode === "deep" || body.presentationMode === "short"
        ? body.presentationMode
        : "short";
    const memo = await getMemo(id);

    if (!memo) {
      return NextResponse.json({ error: "Memo not found." }, { status: 404 });
    }

    if (presentationMode === "short" && (memo.shortGenerated || memo.articleGenerated)) {
      return NextResponse.json({ id: memo.id, presentationMode });
    }

    if (presentationMode === "deep" && memo.deepGenerated && memo.deepDive?.length) {
      return NextResponse.json({ id: memo.id, presentationMode });
    }

    if (presentationMode === "presentation" && memo.presentationGenerated && memo.presentationSlides?.length) {
      return NextResponse.json({ id: memo.id, presentationMode });
    }

    const generated = await generateMemoContent({
      title: memo.title,
      sourceType: memo.sourceType,
      sourceUrl: memo.sourceUrl,
      youtubeUrl: memo.youtubeUrl,
      videoId: memo.videoId,
      channelName: memo.channelName,
      thumbnailUrl: memo.thumbnailUrl,
      durationLabel: memo.durationLabel,
      transcriptStatus: memo.transcriptStatus,
      sourceText: memo.originalSourceText || memo.transcriptText,
      roleLens: memo.roleLens ?? "hai",
      roleName: memo.roleName,
      roleDetails: memo.roleDetails,
      presentationMode,
      provider: body.provider ?? providerFromMemo(memo),
      processedAt: new Date().toISOString()
    });

    const updated =
      presentationMode === "presentation"
        ? await saveMemo({
            ...memo,
            presentationSlides: generated.presentationSlides,
            presentationGenerated: true,
            preferredPresentationMode: "presentation",
            tags: generated.tags.length ? generated.tags : memo.tags,
            analysisProvider: generated.analysisProvider,
            analysisModel: generated.analysisModel
          })
        : presentationMode === "deep"
          ? await saveMemo({
              ...memo,
              summary: memo.summary || generated.summary,
              deepDive: generated.deepDive,
              readingTime: generated.readingTime,
              tags: generated.tags.length ? generated.tags : memo.tags,
              deepGenerated: true,
              preferredPresentationMode: "deep",
              analysisProvider: generated.analysisProvider,
              analysisModel: generated.analysisModel
            })
        : await saveMemo({
            ...memo,
            summary: generated.summary,
            keyIdeas: generated.keyIdeas,
            concepts: generated.concepts,
            relevance: generated.relevance,
            readingTime: generated.readingTime,
            tags: generated.tags.length ? generated.tags : memo.tags,
            articleGenerated: true,
            shortGenerated: true,
            preferredPresentationMode: "short",
            analysisProvider: generated.analysisProvider,
            analysisModel: generated.analysisModel
          });

    revalidatePath("/");
    revalidatePath("/library");
    revalidatePath(`/memos/${updated.id}`);
    revalidatePath(`/memos/${updated.id}/deep`);
    revalidatePath(`/memos/${updated.id}/slides`);
    return NextResponse.json({ id: updated.id, presentationMode });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Something went wrong while generating this format." },
      { status: 500 }
    );
  }
}

function providerFromMemo(memo: MemoRecord): AnalysisProviderId {
  const provider = memo.analysisProvider?.toLowerCase() ?? "";

  if (provider.includes("claude")) return "claude";
  if (provider.includes("codex") || provider.includes("gpt")) return "codex";
  if (provider.includes("gemini")) return "gemini";
  if (provider.includes("heuristic")) return "heuristic";

  return "auto";
}
