import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { deleteMemo, updateMemo } from "@/lib/storage";
import type { MemoPresentationMode } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as {
    tags?: string[];
    preferredPresentationMode?: MemoPresentationMode;
  };

  const memo = await updateMemo(id, {
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    preferredPresentationMode:
      body.preferredPresentationMode === "short" || body.preferredPresentationMode === "deep" || body.preferredPresentationMode === "presentation"
        ? body.preferredPresentationMode
        : undefined
  });

  if (!memo) {
    return NextResponse.json({ error: "Memo not found." }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath(`/memos/${memo.id}`);
  revalidatePath(`/memos/${memo.id}/deep`);
  revalidatePath(`/memos/${memo.id}/slides`);
  return NextResponse.json({ memo });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteMemo(id);

  if (!deleted) {
    return NextResponse.json({ error: "Memo not found." }, { status: 404 });
  }

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath(`/memos/${id}`);
  revalidatePath(`/memos/${id}/deep`);
  revalidatePath(`/memos/${id}/slides`);
  return NextResponse.json({ ok: true });
}
