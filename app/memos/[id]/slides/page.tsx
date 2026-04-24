import { notFound } from "next/navigation";

import { QuickReadSlides } from "@/components/quick-read-slides";
import { getMemo, listMemos } from "@/lib/storage";

export default async function MemoSlidesPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const memo = await getMemo(id);

  if (!memo) {
    notFound();
  }

  const memos = await listMemos();
  const currentIndex = memos.findIndex((item) => item.id === memo.id);
  const nextMemo =
    memos.length > 1 && currentIndex >= 0 ? memos[(currentIndex + 1) % memos.length] : null;

  return <QuickReadSlides memo={memo} nextMemo={nextMemo} />;
}
