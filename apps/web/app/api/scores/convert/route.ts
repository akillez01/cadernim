import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest, isAdmin } from "@/lib/auth-user";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/http";
import { importScoreFileAsMusicXml } from "@/lib/score-import";

export const runtime = "nodejs";

function isFileLike(
  value: FormDataEntryValue | null
): value is File {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as { name?: unknown }).name === "string" &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) return unauthorized();
    if (!isAdmin(user)) return forbidden("Somente administradores podem converter arquivos.");

    const formData = await request.formData();
    const file = formData.get("file");
    if (!isFileLike(file)) {
      return badRequest("Arquivo invalido.");
    }

    const xmlContent = await importScoreFileAsMusicXml(file as unknown as File);
    return NextResponse.json({
      data: {
        fileName: file.name,
        xmlContent
      }
    });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return badRequest(error.message || "Nao foi possivel converter o arquivo para MusicXML.");
    }
    return serverError("Nao foi possivel converter o arquivo para MusicXML.");
  }
}
