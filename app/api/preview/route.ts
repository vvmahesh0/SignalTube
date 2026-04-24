import { NextResponse } from "next/server";

import { UserFacingError } from "@/lib/errors";
import { ingestSource } from "@/lib/source-ingestion";
import { fetchYouTubePreview } from "@/lib/transcript";
import type { SourceType } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url") ?? "";
    const sourceType = (searchParams.get("sourceType") ?? "youtube") as SourceType;

    if (sourceType === "medium" || sourceType === "substack" || sourceType === "blog") {
      const source = await ingestSource(url, sourceType);
      return NextResponse.json({
        title: source.title,
        channelName: source.channelName,
        thumbnailUrl: source.thumbnailUrl ?? "",
        sourceType
      });
    }

    const preview = await fetchYouTubePreview(url);
    return NextResponse.json({ ...preview, sourceType: "youtube" });
  } catch (error) {
    if (error instanceof UserFacingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "We could not preview this video right now." }, { status: 500 });
  }
}
