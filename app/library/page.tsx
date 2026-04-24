import { LibraryScreen } from "@/components/library-screen";
import { listMemos } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const memos = await listMemos();
  return <LibraryScreen memos={memos} />;
}
