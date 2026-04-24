import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { UserFacingError } from "@/lib/errors";
import { processContentWithOptions } from "@/lib/process-video";
import type { AnalysisProviderId, MemoPresentationMode, RoleLensId, SourceType } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      sourceType?: SourceType;
      presentationMode?: MemoPresentationMode;
      roleLens?: RoleLensId;
      roleName?: string;
      roleDetails?: string;
      provider?: AnalysisProviderId;
    };
    const presentationMode: MemoPresentationMode =
      body.presentationMode === "presentation" || body.presentationMode === "deep" || body.presentationMode === "short"
        ? body.presentationMode
        : "short";
    const memo = await processContentWithOptions({
      url: body.url ?? "",
      sourceType: body.sourceType,
      presentationMode,
      roleLens: body.roleLens,
      roleName: body.roleName,
      roleDetails: body.roleDetails,
      provider: body.provider
    });
    revalidatePath("/");
    revalidatePath("/library");
    revalidatePath(`/memos/${memo.id}`);
    revalidatePath(`/memos/${memo.id}/deep`);
    revalidatePath(`/memos/${memo.id}/slides`);
    return NextResponse.json({ id: memo.id, presentationMode: memo.preferredPresentationMode ?? presentationMode });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Something went wrong while building the memo." },
      { status: 500 }
    );
  }
}
