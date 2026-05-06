import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { HymnScoreEditorWrapper } from "@/components/hymn-score-editor-wrapper";

export default async function HymnEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect(`/login?next=/hymns/${id}/edit`);
  }

  const session = verifySessionToken(token);
  if (!session || session.role !== "ADMIN") {
    redirect(`/hymns/${id}`);
  }

  return <HymnScoreEditorWrapper hymnId={id} />;
}
