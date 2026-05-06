import { HymnStudyWorkspace } from "@/components/hymn-study-workspace";

export default async function HymnStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <HymnStudyWorkspace hymnId={id} />;
}
