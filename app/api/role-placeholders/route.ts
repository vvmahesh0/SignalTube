import { NextResponse } from "next/server";

import { generateAdaptiveRolePlaceholders } from "@/lib/role-placeholder-provider";
import type { AnalysisProviderId } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      roleName?: string;
      provider?: AnalysisProviderId;
    };

    const roleName = body.roleName?.trim() ?? "";
    if (!roleName) {
      return NextResponse.json({ error: "Role name is required." }, { status: 400 });
    }

    const placeholders = await generateAdaptiveRolePlaceholders(roleName, body.provider ?? "auto");
    return NextResponse.json({ placeholders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not generate placeholders." },
      { status: 503 }
    );
  }
}
