import { SignalTubeHome } from "@/components/signaltube-home";
import { listMemos } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const memos = await listMemos();
  return <SignalTubeHome recentMemos={memos} />;
}
