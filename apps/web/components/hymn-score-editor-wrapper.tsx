"use client";

import { useRouter } from "next/navigation";
import { HymnScoreEditor } from "@/components/hymn-score-editor";

export function HymnScoreEditorWrapper({ hymnId }: { hymnId: string }) {
  const router = useRouter();
  return (
    <HymnScoreEditor
      hymnId={hymnId}
      onBack={() => router.push(`/hymns/${hymnId}`)}
    />
  );
}
